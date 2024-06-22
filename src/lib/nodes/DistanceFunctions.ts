// @ts-nocheck
import { abs, clamp, cond, float, length, max, min, mul, sign, sqrt, tslFn, vec2, vec3 } from "three/examples/jsm/nodes/Nodes.js";

enum ShapeType {
    Sphere,
    HollowSphere,
    Torus, 
    Pyramid, 
    BoxFrame
}
// Inigo Quilez functions put through the transpiler
// https://iquilezles.org/articles/distfunctions/
// https://threejs.org/examples/?q=webgpu#webgpu_tsl_transpiler

const sdSphere = tslFn( ( [ p_immutable, s_immutable ] ) => {

    const s = float( s_immutable ).toVar();
    const p = vec3( p_immutable ).toVar();
    return length( p ).sub( s );
});

sdSphere.setLayout( {
    name: 'sdSphere',
    type: 'float',
    inputs: [
        { name: 'p', type: 'vec3' },
        { name: 's', type: 'float' }
    ]
} );

const sdHollowSphere = tslFn( ( [ p_immutable, s_immutable, t_immutable ] ) => {
    
        const s = float( s_immutable ).toVar();
        const t = float( t_immutable ).toVar();
        const p = vec3( p_immutable ).toVar();
        return abs( length( p ).sub( s ) ).sub( t );
});

sdHollowSphere.setLayout( {
    name: 'sdHollowSphere',
    type: 'float',
    inputs: [
        { name: 'p', type: 'vec3' },
        { name: 's', type: 'float' },
        { name: 't', type: 'float' }
    ]
} );


const sdTorus = tslFn( ( [ p_immutable, t_immutable ] ) => {

    const t = vec2( t_immutable ).toVar();
    const p = vec3( p_immutable ).toVar();
    const q = vec2( length( p.xz ).sub( t.x ), p.y ).toVar();
    return length( q ).sub( t.y );
});

sdTorus.setLayout( {
	name: 'sdTorus',
	type: 'float',
	inputs: [
		{ name: 'p', type: 'vec3' },
		{ name: 't', type: 'vec2' }
	]
} );

// a slight change to the scaling from the original
const sdPyramid = tslFn( ( [ p_immutable, h_immutable, sc_immutable ] ) => {

	const h = float( h_immutable ).toVar();
	const p = vec3( p_immutable ).toVar();
    const sc = float( sc_immutable ).toVar();
    p.mulAssign( sc );
	const m2 = float( h.mul( h ).add( 0.25 ) ).toVar();
	p.xz.assign( abs( p.xz ) );
	p.xz.assign( cond( p.z.greaterThan( p.x ), p.zx, p.xz ) );
	p.xz.subAssign( 0.5 );
	const q = vec3( p.z, h.mul( p.y ).sub( mul( 0.5, p.x ) ), h.mul( p.x ).add( mul( 0.5, p.y ) ) ).toVar();
	const s = float( max( q.x.negate(), 0.0 ) ).toVar();
	const t = float( clamp( q.y.sub( mul( 0.5, p.z ) ).div( m2.add( 0.25 ) ), 0.0, 1.0 ) ).toVar();
	const a = float( m2.mul( q.x.add( s ).mul( q.x.add( s ) ) ).add( q.y.mul( q.y ) ) ).toVar();
	const b = float( m2.mul( q.x.add( mul( 0.5, t ) ).mul( q.x.add( mul( 0.5, t ) ) ) ).add( q.y.sub( m2.mul( t ) ).mul( q.y.sub( m2.mul( t ) ) ) ) ).toVar();
	const d2 = float( cond( min( q.y, q.x.negate().mul( m2 ).sub( q.y.mul( 0.5 ) ) ).greaterThan( 0.0 ), 0.0, min( a, b ) ) ).toVar();

	return sqrt( d2.add( q.z.mul( q.z ) ).div( m2 ) ).mul( sign( max( q.z, p.y.negate() ) ) );

} );

sdPyramid.setLayout( {
    name: 'sdPyramid',
    type: 'float',
    inputs: [
        { name: 'p', type: 'vec3' },
        { name: 'h', type: 'float' },
        { name: 'sc', type: 'float' }
    ]
} );

const sdBoxFrame = tslFn( ( [ p_immutable, b_immutable, e_immutable ] ) => {

	const e = float( e_immutable ).toVar();
	const b = vec3( b_immutable ).toVar();
	const p = vec3( p_immutable ).toVar();
	p.assign( abs( p ).sub( b ) );
	const q = vec3( abs( p.add( e ) ).sub( e ) ).toVar();

	return min( min( length( max( vec3( p.x, q.y, q.z ), 0.0 ) ).add( min( max( p.x, max( q.y, q.z ) ), 0.0 ) ), length( max( vec3( q.x, p.y, q.z ), 0.0 ) ).add( min( max( q.x, max( p.y, q.z ) ), 0.0 ) ) ), length( max( vec3( q.x, q.y, p.z ), 0.0 ) ).add( min( max( q.x, max( q.y, p.z ) ), 0.0 ) ) );

} );

sdBoxFrame.setLayout( {
    name: 'sdBoxFrame',
    type: 'float',
    inputs: [
        { name: 'p', type: 'vec3' },
        { name: 'b', type: 'vec3' },
        { name: 'e', type: 'float' }
    ]
} );




export { ShapeType, sdTorus, sdSphere, sdPyramid, sdBoxFrame, sdHollowSphere};