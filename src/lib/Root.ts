import { Clock, PerspectiveCamera, Scene } from "three";
import { OrbitControls, WebGL } from "three/examples/jsm/Addons.js";
import WebGPU from "three/examples/jsm/capabilities/WebGPU.js";
import PostProcessing from "three/examples/jsm/renderers/common/PostProcessing.js";
import WebGPURenderer from "three/examples/jsm/renderers/webgpu/WebGPURenderer.js";
import { IAnimatedElement } from "./interfaces/IAnimatedElement";
import { pass } from "three/examples/jsm/nodes/Nodes.js";
import UnrealBloomPass, { unrealBloomPass } from "./display/UnrealBloomPass";
import { ParticlesSDF } from "./elements/ParticlesSDF";
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

export class Root {

    static instance: Root;
    gui = new GUI();
    animatedElements: IAnimatedElement[] = [];
    static registerAnimatedElement(element: IAnimatedElement) {
        if (Root.instance == null) {
            throw new Error("Root instance not found");
        }
        if (Root.instance.animatedElements.indexOf(element) == -1) {
            Root.instance.animatedElements.push(element);
        }
    }

    canvas: HTMLCanvasElement;

    constructor(canvas: HTMLCanvasElement) {

        this.canvas = canvas;

        if (Root.instance != null) {
            console.warn("Root instance already exists");
            return;
        }
        Root.instance = this;
    }

    async init() {
        this.initRenderer();
        this.initCamera();
        this.initScene();
        this.initPost();

        new ParticlesSDF(this.scene, this.camera, this.controls, this.renderer!, this.gui);

        this.clock.start();
        this.renderer!.setAnimationLoop(this.animate.bind(this));

        return new Promise<void>((resolve) => {
            resolve();
        }); 
    }

    renderer?: WebGPURenderer;
    clock: Clock = new Clock(false);
    post?: PostProcessing;
    initRenderer() {
        if (WebGPU.isAvailable() === false && WebGL.isWebGL2Available() === false) {

            document.body.appendChild(WebGPU.getErrorMessage());

            throw new Error('No WebGPU or WebGL2 support');
        }

        this.renderer = new WebGPURenderer({ canvas: this.canvas, antialias: true});
        console.log(this.renderer);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        window.addEventListener('resize', this.onResize.bind(this));

    }

    camera: PerspectiveCamera = new PerspectiveCamera(70, 1, .1, 300);
    controls?: OrbitControls;
    initCamera() {
        const aspect: number = window.innerWidth / window.innerHeight;
        this.camera.aspect = aspect;
        this.camera.position.z = 10;
        this.camera.updateProjectionMatrix();

        this.controls = new OrbitControls(this.camera, this.canvas);
        //this.controls.enableDamping = true;
        this.controls.target.set(0, 0, 0);

    }

    scene: Scene = new Scene();
    initScene() {
    }

    postProcessing?: PostProcessing;
    unrealPass: UnrealBloomPass;
    initPost() {
        
        const params = {
            strength: .5,
            radius: .1,
            threshold: .1,
        };

        const scenePass = pass(this.scene, this.camera);
        const scenePassColor = scenePass.getTextureNode();
        const unrealPass = unrealBloomPass( scenePassColor, params.strength, params.radius, params.threshold);
        
        const bloomFolder = this.gui.addFolder("Bloom");
        bloomFolder.add( unrealPass.strength, 'value', 0.0, 3.0 ).step(0.01).name('Strength');
        bloomFolder.add( unrealPass.radius, 'value', 0.0, 1.0 ).step( 0.01 ).name('Radius');
        bloomFolder.add( unrealPass.threshold, 'value', 0.0, 2.0 ).step(0.01).name('Threshold');

        this.postProcessing = new PostProcessing( this.renderer! );
        this.postProcessing.outputNode = unrealPass;
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer!.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        const dt: number = this.clock.getDelta();
        const elapsed: number = this.clock.getElapsedTime();
        this.controls!.update();
        this.animatedElements.forEach((element) => {
            element.update(dt, elapsed);
        });
        this.postProcessing!.render();
    }
} 