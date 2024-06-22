import { tslFn, timerDelta, vec3, vec2, float, normalize, max, EPSILON } from "three/examples/jsm/nodes/Nodes.js";

/**
 * Normal calculation for a shape function from Inigo Quilez
 */
const calcNormal = tslFn(([pos_immutable, shapeFunc]) => {
    const pos = vec3(pos_immutable).toVar();
    const e = vec2(vec2(1.0, - 1.0).mul(0.5773)).toVar();
    const eps = float(0.0005);
    //const eps = EPSILON;
    return normalize(e.xyy.mul(shapeFunc(pos.add(e.xyy.mul(eps))))
        .add(e.yyx.mul(shapeFunc(pos.add(e.yyx.mul(eps))))
        .add(e.yxy.mul(shapeFunc(pos.add(e.yxy.mul(eps))))
        .add(e.xxx.mul(shapeFunc(pos.add(e.xxx.mul(eps))))
    ))));
});

// get a force toward the surface of the shape, or zero if inside
const conformToSDF = tslFn(([position, shapeFunc, attractionSpeed, attractionForce, stickDistance, stickForce]) => {
    const dt = timerDelta(1.0);
    const distance = shapeFunc(position);
    const iNorm = calcNormal(position, shapeFunc).negate();
    const mDistance = max(0.0, distance);
    const distOverMax = mDistance.div(stickDistance);
    const attractionFactor = iNorm.mul(attractionForce).mul(attractionSpeed.mul(dt)).mul(distOverMax.mul(stickForce));
    return attractionFactor;
});


export { conformToSDF };