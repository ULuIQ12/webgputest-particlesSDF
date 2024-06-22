
// @ts-nocheck
import { IAnimatedElement } from "../interfaces/IAnimatedElement";
import { AdditiveBlending, Color, InstancedMesh, Mesh, PerspectiveCamera, PlaneGeometry, Scene } from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import WebGPURenderer from "three/examples/jsm/renderers/webgpu/WebGPURenderer.js";
import { hash, If, instanceIndex, int, length,oscSine, SpriteNodeMaterial, storage, timerGlobal, tslFn, uniform, uv, vec2, vec3 } from "three/examples/jsm/nodes/Nodes.js";
import StorageInstancedBufferAttribute from "three/examples/jsm/renderers/common/StorageInstancedBufferAttribute.js";
import { Root } from "../Root";
import { conformToSDF } from "../nodes/ConformToSDF";
import { sdBoxFrame, sdHollowSphere, sdPyramid, sdSphere, sdTorus, ShapeType } from "../nodes/DistanceFunctions";
import { turbulence } from "../nodes/Turbulence";
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

export class ParticlesSDF implements IAnimatedElement {

    scene: Scene;
    camera: PerspectiveCamera;
    renderer: WebGPURenderer;

    particleCount: number = 1024 * 128;
    computeParticles;

    attractionSpeed = uniform( 0.75 );
    attractionForce = uniform( .25 );
    stickDistance = uniform(5.0);
    stickForce = uniform( 10 );
    friction = uniform( .98 );

    tAmplitude = uniform( 0.03 );
    tFrequency = uniform( 0.2 );
    tOctaves = uniform( 2 );
    tLacunarity = uniform( 2.0 );
    tDiminish = uniform( 0.5 );
    tTimeScale = uniform( 1.0 );

    
    shape:ShapeType = ShapeType.Torus;
    shapeUniform = uniform( 2 );


    constructor(scene: Scene, camera: PerspectiveCamera, controls: OrbitControls, renderer: WebGPURenderer, guiRef:GUI) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.camera.position.set(0, 35, 50);
        this.camera.lookAt(0, 0, 0);
        this.scene.background = new Color(0x000000);

        const conformFolder = guiRef.addFolder("Conform to SDF");
        conformFolder.add(this, 'shape', Object.values(ShapeType).filter( v => typeof v === 'string' )).onChange( (v) => {
            console.log(v);
            this.shapeUniform.value = Object.values(ShapeType).indexOf(v);
        });
        conformFolder.add(this.attractionSpeed, 'value', 0.0, 5.0).name("Attraction Speed");
        conformFolder.add(this.attractionForce, 'value', 0.0, 50.0).name("Attraction Force");
        conformFolder.add(this.stickDistance, 'value', 0.1, 200.0).name("Stick Distance");
        conformFolder.add(this.stickForce, 'value', 0.0, 20.0).name("Stick Force");

        const turbFolder = guiRef.addFolder("Turbulence");
        turbFolder.add(this.tTimeScale, 'value', 0.0, 10.0).name("Time scale");
        turbFolder.add(this.tAmplitude, 'value', 0.0, 0.1).name("Amplitude");
        turbFolder.add(this.tFrequency, 'value', 0.001, 5.0).name("Frequency");
        turbFolder.add(this.tOctaves, 'value', 0, 10).step(1).name("Octaves");
        turbFolder.add(this.tLacunarity, 'value', 0.0, 5.0).name("Lacunarity");
        turbFolder.add(this.tDiminish, 'value', 0.0, 5.0).name("Diminish");

        const createBuffer = ( type = 'vec3' ) => storage( new StorageInstancedBufferAttribute( this.particleCount, 3 ), type, this.particleCount );
        const positionBuffer = createBuffer();
        const velocityBuffer = createBuffer();
        const colorBuffer = createBuffer();
        
        // mostly the exact same as the particles webgpu example
        const range: number = 10;
        
        const computeInit = tslFn( () => {

            const position = positionBuffer.element( instanceIndex );
            const color = colorBuffer.element( instanceIndex );

            const randX = instanceIndex.hash();
            const randY = instanceIndex.add( 2 ).hash();
            const randZ = instanceIndex.add( 3 ).hash();

            position.x = randX.mul( range ).sub(range*.5)
            position.y = randY.mul( range ).sub(range*.5)
            position.z = randZ.mul( range ).sub(range*.5)

            const rgb = vec3( randX.mul(.25).add(.75), randY.mul(.5), randZ.mul( 0.05) );
            color.assign(rgb );

        } )().compute( this.particleCount );

        // prepare the shape functions
        const shapeTorus = tslFn( ([ pos_immutable ]) => {
            return sdTorus( pos_immutable, vec2( 20.0, 0.5 ) );        
        } );
        const shapeSphere = tslFn( ([ pos_immutable ]) => {
            return sdSphere( pos_immutable, 10.0 );
        } );
        const shapePyramid = tslFn( ([ pos_immutable ]) => {
            const mPos = vec3( pos_immutable ).toVar();
            mPos.y.addAssign( 10.0 );
            return sdPyramid( mPos, 1.0, 0.05 );
        });
        const shapeBoxFrame = tslFn( ([ pos_immutable ]) => {
            return sdBoxFrame( pos_immutable, vec3( 20.0, 15.0, 10.0 ), vec3( 0.1, 0.1, 0.1 ));
        });
        const shapeHSphere = tslFn( ([ pos_immutable ]) => {
            return sdHollowSphere( pos_immutable, 15.0, 0.95 );
        });

        const computeUpdate = tslFn( ( ) => {
            const position = positionBuffer.element( instanceIndex );
            const velocity = velocityBuffer.element( instanceIndex );
            const shape = int( this.shapeUniform ).toVar();
            // shoud probably build on demand rather than this
            If( shape.equal( 0 ), () => {
                velocity.addAssign( conformToSDF(position, shapeSphere, this.attractionSpeed, this.attractionForce, this.stickDistance, this.stickForce) );
            })
            .elseif( shape.equal( 1 ), () => {
                velocity.addAssign( conformToSDF(position, shapeHSphere, this.attractionSpeed, this.attractionForce, this.stickDistance, this.stickForce) );
            })
            .elseif( shape.equal( 2 ), () => {
                velocity.addAssign( conformToSDF(position, shapeTorus, this.attractionSpeed, this.attractionForce, this.stickDistance, this.stickForce) );
            })
            .elseif( shape.equal( 3 ), () => {
                velocity.addAssign( conformToSDF(position, shapePyramid, this.attractionSpeed, this.attractionForce, this.stickDistance, this.stickForce) );
            })
            .elseif( shape.equal( 4 ), () => {
                velocity.addAssign( conformToSDF(position, shapeBoxFrame, this.attractionSpeed, this.attractionForce, this.stickDistance, this.stickForce) );
            });

            velocity.addAssign( turbulence(position, this.tTimeScale, this.tAmplitude, this.tFrequency, this.tOctaves, this.tLacunarity, this.tDiminish));
            
            position.addAssign( velocity );
            velocity.mulAssign( this.friction );

        } );

        this.computeParticles = computeUpdate().compute( this.particleCount );
        const particleMat:SpriteNodeMaterial = new SpriteNodeMaterial();
        particleMat.colorNode = colorBuffer.element( instanceIndex )
        particleMat.opacityNode = length( uv().sub(.5).mul(2.0) ).oneMinus().pow(3.0); // rather than loading the sprite
        particleMat.scaleNode = oscSine( timerGlobal(0.5).add(hash(instanceIndex).mul(10.0))).mul(.25).add(.1);

        particleMat.transparent = true;
        particleMat.blending = AdditiveBlending;
        particleMat.depthWrite = false;
        particleMat.depthTest = true;  
        particleMat.positionNode = positionBuffer.toAttribute();

        const particles = new InstancedMesh( new PlaneGeometry(1, 1), particleMat, this.particleCount );
        particles.frustumCulled = false;
        this.scene.add( particles );

        this.renderer.compute( computeInit );
        
        Root.registerAnimatedElement(this);
    }

    update(dt: number, elapsed: number): void {
        this.renderer.compute( this.computeParticles);
        
    }
}