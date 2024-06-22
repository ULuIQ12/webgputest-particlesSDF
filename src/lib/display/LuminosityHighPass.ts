import { RenderTarget, Vector2 } from "three";
import PassNode, { PassTextureNode, texturePass } from "three/examples/jsm/nodes/display/PassNode.js";
import { addNodeElement, dot, float, mix, Node, nodeObject, NodeUpdateType, ShaderNodeObject, smoothstep, TempNode, tslFn, uv, vec3, vec4 } from "three/examples/jsm/nodes/Nodes.js";
import QuadMesh from "three/examples/jsm/objects/QuadMesh.js";

/**
 * This one seems to work correctly
 */
const quadMesh: QuadMesh = new QuadMesh();
class LuminosityHighPassNode extends TempNode {
    _textureNode: ShaderNodeObject<PassTextureNode>;
    _material;
    _rt: RenderTarget;
    _threshold: Node | number;
    _smoothWidth: Node | number;
    resolution: Vector2;
    textureNode: ShaderNodeObject<PassTextureNode>;
    constructor(textureNode: ShaderNodeObject<PassTextureNode>, threshold: Node | number, smoothWidth: Node | number) {
        super('vec4');
        this.textureNode = textureNode;
        this._threshold = threshold;
        this._smoothWidth = smoothWidth;
        this._rt = new RenderTarget();
        this._rt.texture.name = "LuminosityHighPass rt";
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

        quadMesh.material = this._material;

        this.setSize(map.image.width, map.image.height);

        const textureType = map.type;

        this._rt.texture.type = textureType;

        renderer.setRenderTarget(this._rt);

        quadMesh.render(renderer);
        renderer.setRenderTarget(currentRenderTarget);
        textureNode.value = currentTexture;

    }

    setup(builder) {
        const textureNode = this.textureNode;

        if (textureNode.isTextureNode !== true) {
            console.error('LuminosityHighPassNode requires a TextureNode.');
            return vec4();
        }

        const uvNode = textureNode.uvNode || uv();
        const sampleTexture = (uv) => textureNode.cache().context({ getUV: () => uv, forceUVContext: true });

        const applyThreshold = tslFn(() => {
            const color = sampleTexture(uvNode);
            const v = dot(color.xyz, vec3(0.299, 0.587, 0.114));
            const output = vec4(0.0);
            const mixFactor = smoothstep(float(this._threshold), float(this._threshold).add(float(this._smoothWidth)), v);
            return mix(output, color, mixFactor);
        });
        const material = this._material || (this._material = builder.createNodeMaterial());
        material.fragmentNode = applyThreshold();
        const properties = builder.getNodeProperties(this);
        properties.textureNode = textureNode;
        return this._textureNode;
    }
}

export const luminosityHighPass = (node, threshold, smoothWidth) => nodeObject(new LuminosityHighPassNode(nodeObject(node), threshold, smoothWidth));
addNodeElement("luminosityHighPass", luminosityHighPass);
export default LuminosityHighPassNode;