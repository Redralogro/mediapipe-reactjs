/* eslint-disable no-unused-vars */
import * as math from "mathjs"
import { SVD } from 'svd-js'


const define_control_points = () => {
    return [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
        [0, 0, 0]
    ]
}

const transpose = (matrix) => {
    return matrix[0].map((col, i) => matrix.map(row => row[i]));
}


const compute_alphas = (Xw, Cw) => {
    const n = Xw.length
    const X = transpose(Xw)
    X.push(math.ones([n]))
    const C = transpose(Cw)
    C.push(math.ones([4]))
    let Alph_ = math.multiply(math.inv(C), X)
    return transpose(Alph_)
}

const compute_M_ver2 = (U, Alph, A) => {
    const n = Alph.length
    const fu = A[0][0]
    const fv = A[1][1]
    const u0 = A[0][2]
    const v0 = A[1][2]
    const nrows_M = 2 * n;
    const ncols_M = 12;
    const M = math.zeros([nrows_M, ncols_M])

    for (let i = 0; i < n; i++) {
        const a1 = Alph[i][0];
        const a2 = Alph[i][1];
        const a3 = Alph[i][2];
        const a4 = Alph[i][3];
        const ui = U[i][0];
        const vi = U[i][1];
        const M_ = [
            [a1 * fu, 0, a1 * (u0 - ui),
                a2 * fu, 0, a2 * (u0 - ui),
                a3 * fu, 0, a3 * (u0 - ui),
                a4 * fu, 0, a4 * (u0 - ui)
            ],
            [0, a1 * fv, a1 * (v0 - vi),
                0, a2 * fv, a2 * (v0 - vi), 0, a3 * fv, a3 * (v0 - vi), 0, a4 * fv, a4 * (v0 - vi)
            ]
        ];
        // console.log('-------')
        // console.log(M_)
        M[2 * i] = M_[0]
        M[2 * i + 1] = M_[1]
    }
    return M
}

const kernel_noise = (M, dimker) => {
    const MtM = math.multiply(math.transpose(M), M)
    const ans = math.eigs(MtM)
    const E = ans.values
    const U = ans.vectors
    const K = []
    for (let i = 0; i < U.length; i++) {
        // K.push(U[i].reverse())
        let tmp = U[i].slice(0, dimker)
        K.push(tmp.reverse())
    }
    return K
}
const compute_norm_sign_scaling_factor = (X1, Cw, Alph, Xw) => {
    const n = Xw.length
    const Cc_ = []
    for (let i = 0; i < math.ceil(X1.length / 3); i++) {
        Cc_.push([X1[3 * i][0], X1[3 * i + 1][0], X1[3 * i + 2][0]])
    }
    let Xc_ = math.multiply(Alph, Cc_)
        //compute distances in world coordinates w.r.t. the centroid
    let centr_w = math.mean(Xw, 0)
    let centroid_w = []

    for (let i = 0; i < n; i++) {
        centroid_w.push(centr_w)
    }
    let tmp1 = math.add(Xw, math.multiply(centroid_w, -1))
    tmp1 = math.dotPow(tmp1, 2)
    let dist_w = []
    for (let i = 0; i < tmp1.length; i++) {
        dist_w.push([math.sqrt(tmp1[i][0] + tmp1[i][1] + tmp1[i][2])])
    }
    //compute distances in camera coordinates w.r.t. the centroid
    let centr_c = math.mean(Xc_, 0);
    let centroid_c = []
    for (let i = 0; i < n; i++) {
        centroid_c.push(centr_c)
    }
    let tmp2 = math.add(Xc_, math.multiply(centroid_c, -1))
    tmp2 = math.dotPow(tmp2, 2)
    let dist_c = []
    for (let i = 0; i < tmp2.length; i++) {
        dist_c.push([math.sqrt(tmp2[i][0] + tmp2[i][1] + tmp2[i][2])])
    }
    // sc=1/(inv(dist_c'*dist_c)*dist_c'*dist_w)
    let sc = 1 / (math.multiply(math.multiply(math.inv(math.multiply(math.transpose(dist_c), dist_c)), math.transpose(dist_c)), dist_w))
    let Cc = math.multiply(Cc_, 1 / sc),
        Xc = math.multiply(Alph, Cc);
    let test = math.column(Xc, 2)
    const isHaveMinus = test.every(item => item[0] <= 0);
    if (isHaveMinus) {
        sc = -sc;
        Xc = math.multiply(Xc, -1);
    }
    return { Cc, Xc }
}

const slice = (x, ...idx) => math.evaluate('x[' + idx.join(', ') + ']', { x: x })
const eulerAngle = (matM) => {
    let matR = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
    ]
    let matQ = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
    ]

    let DBL_EPSILON = 1e-12;
    /* Find Givens rotation Q_x for x axis (left multiplication). */
    /*
         ( 1  0  0 )
    Qx = ( 0  c  s ), c = m33/sqrt(m32^2 + m33^2), s = m32/sqrt(m32^2 + m33^2)
         ( 0 -s  c )
    */
    let s = matM[2][1];
    let c = matM[2][2];
    let z = 1. / math.sqrt(c * c + s * s + DBL_EPSILON);
    c *= z;
    s *= z;


    let Qx = [
        [1, 0, 0],
        [0, c, s],
        [0, -s, c]
    ];
    matR = math.multiply(matM, Qx)
    matR[2][1] = 0;


    /* Find Givens rotation for y axis. */
    /*
         ( c  0 -s )
    Qy = ( 0  1  0 ), c = m33/sqrt(m31^2 + m33^2), s = -m31/sqrt(m31^2 + m33^2)
         ( s  0  c )
    */
    s = -matR[2][0];
    c = matR[2][2];
    z = 1. / math.sqrt(c * c + s * s + DBL_EPSILON);
    c = c * z;
    s = s * z;

    let Qy = [
        [c, 0, -s],
        [0, 1, 0],
        [s, 0, c]
    ];
    matM = math.multiply(matR, Qy)
    matM[2][0] = 0;

    /* Find Givens rotation for z axis. */
    /*
         ( c  s  0 )
    Qz = (-s  c  0 ), c = m22/sqrt(m21^2 + m22^2), s = m21/sqrt(m21^2 + m22^2)
         ( 0  0  1 )
    */

    s = matM[1][0];
    c = matM[1][1];
    z = 1. / math.sqrt(c * c + s * s + DBL_EPSILON);
    c = c * z;
    s = s * z;

    let Qz = [
        [c, s, 0],
        [-s, c, 0],
        [0, 0, 1]
    ];
    matR = math.multiply(matM, Qz)
    matR[1][0] = 0;

    // Solve the decomposition ambiguity.
    // Diagonal entries of R, except the last one, shall be positive.
    // Further rotate R by 180 degree if necessary
    if (matR[0][0] < 0) {
        if (matR[1][1] < 0) {
            // rotate around z for 180 degree, i.e. a rotation matrix of
            // [-1,  0,  0],
            // [ 0, -1,  0],
            // [ 0,  0,  1]
            matR[0][0] *= -1;
            matR[0][1] *= -1;
            matR[1][1] *= -1;

            Qz[0][0] *= -1;
            Qz[0][1] *= -1;
            Qz[1][0] *= -1;
            Qz[1][1] *= -1;
        } else {
            // rotate around y for 180 degree, i.e. a rotation matrix of
            // [-1,  0,  0],
            // [ 0,  1,  0],
            // [ 0,  0, -1]
            matR[0][0] *= -1;
            matR[0][2] *= -1;
            matR[1][2] *= -1;
            matR[2][2] *= -1;

            Qz = math.transpose(Qz);

            Qy[0][0] *= -1;
            Qy[0][2] *= -1;
            Qy[2][0] *= -1;
            Qy[2][2] *= -1;
        }
    } else if (matR[1][1] < 0) {
        // ??? for some reason, we never get here ???

        // rotate around x for 180 degree, i.e. a rotation matrix of
        // [ 1,  0,  0],
        // [ 0, -1,  0],
        // [ 0,  0, -1]
        matR[0][1] *= -1.0;
        matR[0][2] *= -1.0;
        matR[1][1] *= -1.0;
        matR[1][2] *= -1.0;
        matR[2][2] *= -1.0;

        Qz = math.transpose(Qz);
        Qy = math.transpose(Qy);

        Qx[1][1] *= -1.0;
        Qx[1][2] *= -1.0;
        Qx[2][1] *= -1.0;
        Qx[2][2] *= -1.0;
    }

    console.log({ R: matR, Q: matQ })
        // calculate the euler angle
    let ax = math.acos(Qx[1][1]) * (Qx[1][2] >= 0. ? 1. : -1.) * (180.0 / math.pi);
    let ay = math.acos(Qy[0][0]) * (Qy[2][0] >= 0. ? 1. : -1.) * (180.0 / math.pi);
    let az = math.acos(Qz[0][0]) * (Qz[0][1] >= 0. ? 1. : -1.) * (180.0 / math.pi);
    return [ax, ay, az]
}
const getrotT = (wpts, cpts) => {
    let n = wpts.length
    let M = math.zeros([3, 3])
    let ccent = math.mean(cpts, 0)
    let wcent = math.mean(wpts, 0)
        // console.log(ccent)
        // console.log(wcent)
    for (let i = 0; i < 3; i++) {
        // let col_c = math.evaluate("cpts[:, i] - ccent[i, :] * O", {cpts: cpts, ccent: ccent, i: i + 1, n: n, O: math.ones([n, 1])})._data
        let col_c = math.subtract(slice(cpts, ':', i + 1), math.multiply(ccent[i], math.ones([n, 1])))
            // console.log(col_c)
            // let col_c = math.add(math.column(cpts,i),math.multiply(math.ones([n,1]), -1*ccent[i]))
        let col_w = math.add(math.column(wpts, i), math.multiply(math.ones([n, 1]), -1 * wcent[i]))
        for (let j = 0; j < col_w.length; j++) {
            cpts[j][i] = col_c[j][0]
            wpts[j][i] = col_w[j][0]
        }
    }
    for (let i = 1; i <= n; i++) {
        M = math.add(M, math.multiply(math.transpose(slice(cpts, `${i}`, ':')), slice(wpts, `${i}`, ':')))
    }
    const { u, q, v } = SVD(M)
    let R, T;


    R = math.evaluate("u * v'", { u: u, v: v })
        // console.log(R)
    if (math.det(R) < 0) {
        R = math.multiply(R, -1)
    }

    T = math.evaluate("c' - R * wc'", { c: ccent, wc: wcent, R: R })

    return { R, T }
}





export const efficient_pnp = (face_3d, face_2d, cam_matrix) => {

    let Xw = face_3d;
    let U = face_2d;
    let A = cam_matrix;
    let Cw = define_control_points()
    let Alph = compute_alphas(Xw, Cw)
    let M = compute_M_ver2(U, Alph, A)
    let dimker = 4
    let Km = kernel_noise(M, dimker)
    let dim_ker = 1
    let X1 = math.column(Km, dimker - 1)
    let { Cc, Xc } = compute_norm_sign_scaling_factor(X1, Cw, Alph, Xw);
    let { R, T } = getrotT(Xw, Xc)
    let angle = eulerAngle(R)
    let [x, y, z] = math.multiply(360, angle)
    console.log("angle", math.multiply(360, angle))
    let text
    if (y < -10) {
        text = "Left side"
    } else if (y > 10) {
        text = "Right side"
    } else if (x < -10) {
        text = "Looking Down"
    } else if (x > 10) {
        text = "Looking Up"
    } else {
        text = "Forward"
    }
    return text
}

// efficient_pnp(face_3d, face_2d, cam_matrix)