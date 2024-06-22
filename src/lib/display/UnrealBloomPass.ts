import { RenderTarget, Vector2 } from "three";
import PassNode, { PassTextureNode, texturePass } from "three/examples/jsm/nodes/display/PassNode.js";
import { addNodeElement, dodge, dot, exp, float, mix, mul, Node, nodeObject, NodeUpdateType, overlay, ShaderNodeObject, smoothstep, sub, TempNode, texture, tslFn, uniform, UniformNode, uv, vec2, vec3, vec4 } from "three/examples/jsm/nodes/Nodes.js";
import QuadMesh from "three/examples/jsm/objects/QuadMesh.js";
import { luminosityHighPass } from "./LuminosityHighPass";


const quadMesh: QuadMesh = new QuadMesh();

const bloomFactors = [ 1.0, 0.8, 0.6, 0.4, 0.2 ];
const kernelSizeArray = [ 3, 5, 7, 9, 11 ];


class UnrealBloomPass extends TempNode {
    _textureNode: ShaderNodeObject<PassTextureNode>;
    _material;
    _rt: RenderTarget;
    _smoothWidth: number = 0.01;
    threshold: ShaderNodeObject<UniformNode<number>>;
    strength: ShaderNodeObject<UniformNode<number>>;
    radius: ShaderNodeObject<UniformNode<number>>;
    nMips:number = 5;
    resolution: Vector2;
    textureNode: ShaderNodeObject<PassTextureNode>;
    constructor(textureNode: ShaderNodeObject<PassTextureNode>, strength:number = .5, radius:number = .5, threshold:number = .5) {
        super('vec4');
        this.textureNode = textureNode;
        this.threshold = uniform(threshold);
        this.strength = uniform(strength);
        this.radius = uniform(radius);
        this._rt = new RenderTarget();
        this._rt.texture.name = "unrealBloom rt";
        this._textureNode = texturePass( (this as unknown as PassNode), this._rt.texture);
        
        this.resolution = new Vector2(1, 1);
        this.updateBeforeType = NodeUpdateType.RENDER;
        
    }

    setSize(width, height) {

        width = Math.max(Math.round(width * this.resolution.x), 1);
        height = Math.max(Math.round(height * this.resolution.y), 1);

        this._rt.setSize(width, height);
    }

    getTextureNode() {
        return this._textureNode;
    }

    updateBefore(frame) {

        const { renderer } = frame;
        const textureNode = this.textureNode;
        const map = textureNode.value;

        const currentRenderTarget = renderer.getRenderTarget();
        const currentTexture = textureNode.value;

        this.setSize(map.image.width, map.image.height);
        const textureType = map.type;
        this._rt.texture.type = textureType;

        quadMesh.material = this._material;
        renderer.setRenderTarget(this._rt);
        quadMesh.render(renderer);
        renderer.setRenderTarget(currentRenderTarget);
        textureNode.value = currentTexture;
    }

    setup(builder) {
        const textureNode = this.textureNode;

        if (textureNode.isTextureNode !== true) {
            console.error('UnrealBloomPass requires a TextureNode.');
            return vec4();
        }

        const uvNode = textureNode.uvNode || uv();
        const sampleTexture = (uv) => textureNode.cache().context({ getUV: () => uv, forceUVContext: true });

        const blurredLayers = [];
        let rx = 0.5;
        let ry = 0.5;
        /**
         * this is probably all wrong
         */
        for( let i = 0; i < this.nMips; i++ ) {
            
            const layer = luminosityHighPass(textureNode, this.threshold, this._smoothWidth);
            const blurredlayer = layer.getTextureNode().gaussianBlur( kernelSizeArray[i] );
            blurredlayer.resolution.set( rx, ry);
            blurredLayers.push( blurredlayer);
            rx = rx / 2;
            ry = ry / 2;
        }
        const lerpBloomFactor = tslFn( ( [ factor ] ) => {
            const mirrorFactor = float( sub( 1.2, factor ) ).toVar();        
            return mix( factor, mirrorFactor, this.radius );        
        } );
        
        const composeBloom = tslFn(() => {
            const srcColor = sampleTexture(uvNode);
            const total = vec4(0.0).toVar();
            for( let i = 0; i < this.nMips; i++ ) {
                const lfac = lerpBloomFactor( bloomFactors[i] );
                total.addAssign( blurredLayers[i].mul(lfac) );
            }
            return srcColor.add( total.mul( float( this.strength) ) );
        });

        const material = this._material || (this._material = builder.createNodeMaterial());
        material.fragmentNode = composeBloom();
        const properties = builder.getNodeProperties(this);
        properties.textureNode = textureNode;
        return this._textureNode;
    }


}

export const unrealBloomPass = (node, strength, radius, threshold) => nodeObject(new UnrealBloomPass(nodeObject(node), strength, radius, threshold));
addNodeElement("unrealBloomPass", unrealBloomPass);
export default UnrealBloomPass;