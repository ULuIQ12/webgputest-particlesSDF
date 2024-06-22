import { float, mx_fractal_noise_vec3, timerLocal, tslFn, uint, vec3 } from "three/examples/jsm/nodes/Nodes.js";

// just a wrapper for mx_fractal_noise_vec3, ideally should have other noise options
const turbulence = tslFn(([ pos_immutable, timeScale_immutable, amplitude_immutable, frequency_immutable, octaves_immutable, lacunarity_immutable, diminish_immutable ]) => {
    const timeScale = float(timeScale_immutable).toVar();
    const timer = timerLocal(1.0);    
    const frequency = float(frequency_immutable).toVar();
    const pos = vec3(pos_immutable).toVar().mul(frequency);
    const amplitude = float(amplitude_immutable).toVar();    
    const octaves = uint(octaves_immutable).toVar();
    const lacunarity = float(lacunarity_immutable).toVar();
    const diminish = float(diminish_immutable).toVar();

    return mx_fractal_noise_vec3(pos.add(timer.mul(timeScale)), octaves, lacunarity, diminish).mul(amplitude);
});

export { turbulence };