// Copyright (c) 2015-2020 The Decred developers
// Copyright 2013-2014 The btcsuite developers
// Use of this source code is governed by an ISC
// license that can be found in the LICENSE file.

package secp256k1

import (
	"encoding/hex"
	"math/big"
)

// References:
//   [SECG]: Recommended Elliptic Curve Domain Parameters
//     https://www.secg.org/sec2-v2.pdf
//
//   [GECC]: Guide to Elliptic Curve Cryptography (Hankerson, Menezes, Vanstone)

// All group operations are performed using Jacobian coordinates.  For a given
// (x, y) position on the curve, the Jacobian coordinates are (x1, y1, z1)
// where x = x1/z1^2 and y = y1/z1^3.

// hexToFieldVal converts the passed hex string into a FieldVal and will panic
// if there is an error.  This is only provided for the hard-coded constants so
// errors in the source code can be detected. It will only (and must only) be
// called with hard-coded values.
func hexToFieldVal(s string) *FieldVal {
	b, err := hex.DecodeString(s)
	if err != nil {
		panic("invalid hex in source file: " + s)
	}
	var f FieldVal
	if overflow := f.SetByteSlice(b); overflow {
		panic("hex in source file overflows mod P: " + s)
	}
	return &f
}

var (
	// Next 6 constants are from Hal Finney's bitcointalk.org post:
	// https://bitcointalk.org/index.php?topic=3238.msg45565#msg45565
	// May he rest in peace.
	//
	// They have also been independently derived from the code in the
	// EndomorphismVectors function in genstatics.go.
	endomorphismLambda = fromHex("5363ad4cc05c30e0a5261c028812645a122e22ea20816678df02967c1b23bd72")
	endomorphismBeta   = hexToFieldVal("7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee")
	endomorphismA1     = fromHex("3086d221a7d46bcde86c90e49284eb15")
	endomorphismB1     = fromHex("-e4437ed6010e88286f547fa90abfe4c3")
	endomorphismA2     = fromHex("114ca50f7a8e2f3f657c1108d9d44cfd8")
	endomorphismB2     = fromHex("3086d221a7d46bcde86c90e49284eb15")

	// Alternatively, the following parameters are valid as well, however, they
	// seem to be about 8% slower in practice.
	//
	// endomorphismLambda = fromHex("AC9C52B33FA3CF1F5AD9E3FD77ED9BA4A880B9FC8EC739C2E0CFC810B51283CE")
	// endomorphismBeta = hexToFieldVal("851695D49A83F8EF919BB86153CBCB16630FB68AED0A766A3EC693D68E6AFA40")
	// endomorphismA1 = fromHex("E4437ED6010E88286F547FA90ABFE4C3")
	// endomorphismB1 = fromHex("-3086D221A7D46BCDE86C90E49284EB15")
	// endomorphismA2 = fromHex("3086D221A7D46BCDE86C90E49284EB15")
	// endomorphismB2 = fromHex("114CA50F7A8E2F3F657C1108D9D44CFD8")
)

// JacobianPoint is an element of the group formed by the secp256k1 curve in
// Jacobian projective coordinates and thus represents a point on the curve.
type JacobianPoint struct {
	// The X coordinate in Jacobian projective coordinates.  The affine point is
	// X/z^2.
	X FieldVal

	// The Y coordinate in Jacobian projective coordinates.  The affine point is
	// Y/z^3.
	Y FieldVal

	// The Z coordinate in Jacobian projective coordinates.
	Z FieldVal
}

// MakeJacobianPoint returns a Jacobian point with the provided X, Y, and Z
// coordinates.
func MakeJacobianPoint(x, y, z *FieldVal) JacobianPoint {
	var p JacobianPoint
	p.X.Set(x)
	p.Y.Set(y)
	p.Z.Set(z)
	return p
}

// Set sets the Jacobian point to the provided point.
func (p *JacobianPoint) Set(other *JacobianPoint) {
	p.X.Set(&other.X)
	p.Y.Set(&other.Y)
	p.Z.Set(&other.Z)
}

// ToAffine reduces the Z value of the existing point to 1 effectively
// making it an affine coordinate in constant time.  The point will be
// normalized.
func (p *JacobianPoint) ToAffine() {
	// Inversions are expensive and both point addition and point doubling
	// are faster when working with points that have a z value of one.  So,
	// if the point needs to be converted to affine, go ahead and normalize
	// the point itself at the same time as the calculation is the same.
	var zInv, tempZ FieldVal
	zInv.Set(&p.Z).Inverse()  // zInv = Z^-1
	tempZ.SquareVal(&zInv)    // tempZ = Z^-2
	p.X.Mul(&tempZ)           // X = X/Z^2 (mag: 1)
	p.Y.Mul(tempZ.Mul(&zInv)) // Y = Y/Z^3 (mag: 1)
	p.Z.SetInt(1)             // Z = 1 (mag: 1)

	// Normalize the x and y values.
	p.X.Normalize()
	p.Y.Normalize()
}

// addZ1AndZ2EqualsOne adds two Jacobian points that are already known to have
// z values of 1 and stores the result in the provided result param.  That is to
// say result = p1 + p2.  It performs faster addition than the generic add
// routine since less arithmetic is needed due to the ability to avoid the z
// value multiplications.
//
// NOTE: The points must be normalized for this function to return the correct
// result.  The resulting point will be normalized.
func addZ1AndZ2EqualsOne(p1, p2, result *JacobianPoint) {
	// To compute the point addition efficiently, this implementation splits
	// the equation into intermediate elements which are used to minimize
	// the number of field multiplications using the method shown at:
	// https://hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-0.html#addition-mmadd-2007-bl
	//
	// In particular it performs the calculations using the following:
	// H = X2-X1, HH = H^2, I = 4*HH, J = H*I, r = 2*(Y2-Y1), V = X1*I
	// X3 = r^2-J-2*V, Y3 = r*(V-X3)-2*Y1*J, Z3 = 2*H
	//
	// This results in a cost of 4 field multiplications, 2 field squarings,
	// 6 field additions, and 5 integer multiplications.
	x1, y1 := &p1.X, &p1.Y
	x2, y2 := &p2.X, &p2.Y
	x3, y3, z3 := &result.X, &result.Y, &result.Z

	// When the x coordinates are the same for two points on the curve, the
	// y coordinates either must be the same, in which case it is point
	// doubling, or they are opposite and the result is the point at
	// infinity per the group law for elliptic curve cryptography.
	if x1.Equals(x2) {
		if y1.Equals(y2) {
			// Since x1 == x2 and y1 == y2, point doubling must be
			// done, otherwise the addition would end up dividing
			// by zero.
			DoubleNonConst(p1, result)
			return
		}

		// Since x1 == x2 and y1 == -y2, the sum is the point at
		// infinity per the group law.
		x3.SetInt(0)
		y3.SetInt(0)
		z3.SetInt(0)
		return
	}

	// Calculate X3, Y3, and Z3 according to the intermediate elements
	// breakdown above.
	var h, i, j, r, v FieldVal
	var negJ, neg2V, negX3 FieldVal
	h.Set(x1).Negate(1).Add(x2)                // H = X2-X1 (mag: 3)
	i.SquareVal(&h).MulInt(4)                  // I = 4*H^2 (mag: 4)
	j.Mul2(&h, &i)                             // J = H*I (mag: 1)
	r.Set(y1).Negate(1).Add(y2).MulInt(2)      // r = 2*(Y2-Y1) (mag: 6)
	v.Mul2(x1, &i)                             // V = X1*I (mag: 1)
	negJ.Set(&j).Negate(1)                     // negJ = -J (mag: 2)
	neg2V.Set(&v).MulInt(2).Negate(2)          // neg2V = -(2*V) (mag: 3)
	x3.Set(&r).Square().Add(&negJ).Add(&neg2V) // X3 = r^2-J-2*V (mag: 6)
	negX3.Set(x3).Negate(6)                    // negX3 = -X3 (mag: 7)
	j.Mul(y1).MulInt(2).Negate(2)              // J = -(2*Y1*J) (mag: 3)
	y3.Set(&v).Add(&negX3).Mul(&r).Add(&j)     // Y3 = r*(V-X3)-2*Y1*J (mag: 4)
	z3.Set(&h).MulInt(2)                       // Z3 = 2*H (mag: 6)

	// Normalize the resulting field values to a magnitude of 1 as needed.
	x3.Normalize()
	y3.Normalize()
	z3.Normalize()
}

// addZ1EqualsZ2 adds two Jacobian points that are already known to have the
// same z value and stores the result in the provided result param.  That is to
// say result = p1 + p2.  It performs faster addition than the generic add
// routine since less arithmetic is needed due to the known equivalence.
//
// NOTE: The points must be normalized for this function to return the correct
// result.  The resulting point will be normalized.
func addZ1EqualsZ2(p1, p2, result *JacobianPoint) {
	// To compute the point addition efficiently, this implementation splits
	// the equation into intermediate elements which are used to minimize
	// the number of field multiplications using a slightly modified version
	// of the method shown at:
	// https://hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-0.html#addition-mmadd-2007-bl
	//
	// In particular it performs the calculations using the following:
	// A = X2-X1, B = A^2, C=Y2-Y1, D = C^2, E = X1*B, F = X2*B
	// X3 = D-E-F, Y3 = C*(E-X3)-Y1*(F-E), Z3 = Z1*A
	//
	// This results in a cost of 5 field multiplications, 2 field squarings,
	// 9 field additions, and 0 integer multiplications.
	x1, y1, z1 := &p1.X, &p1.Y, &p1.Z
	x2, y2 := &p2.X, &p2.Y
	x3, y3, z3 := &result.X, &result.Y, &result.Z

	// When the x coordinates are the same for two points on the curve, the
	// y coordinates either must be the same, in which case it is point
	// doubling, or they are opposite and the result is the point at
	// infinity per the group law for elliptic curve cryptography.
	if x1.Equals(x2) {
		if y1.Equals(y2) {
			// Since x1 == x2 and y1 == y2, point doubling must be
			// done, otherwise the addition would end up dividing
			// by zero.
			DoubleNonConst(p1, result)
			return
		}

		// Since x1 == x2 and y1 == -y2, the sum is the point at
		// infinity per the group law.
		x3.SetInt(0)
		y3.SetInt(0)
		z3.SetInt(0)
		return
	}

	// Calculate X3, Y3, and Z3 according to the intermediate elements
	// breakdown above.
	var a, b, c, d, e, f FieldVal
	var negX1, negY1, negE, negX3 FieldVal
	negX1.Set(x1).Negate(1)                // negX1 = -X1 (mag: 2)
	negY1.Set(y1).Negate(1)                // negY1 = -Y1 (mag: 2)
	a.Set(&negX1).Add(x2)                  // A = X2-X1 (mag: 3)
	b.SquareVal(&a)                        // B = A^2 (mag: 1)
	c.Set(&negY1).Add(y2)                  // C = Y2-Y1 (mag: 3)
	d.SquareVal(&c)                        // D = C^2 (mag: 1)
	e.Mul2(x1, &b)                         // E = X1*B (mag: 1)
	negE.Set(&e).Negate(1)                 // negE = -E (mag: 2)
	f.Mul2(x2, &b)                         // F = X2*B (mag: 1)
	x3.Add2(&e, &f).Negate(3).Add(&d)      // X3 = D-E-F (mag: 5)
	negX3.Set(x3).Negate(5).Normalize()    // negX3 = -X3 (mag: 1)
	y3.Set(y1).Mul(f.Add(&negE)).Negate(3) // Y3 = -(Y1*(F-E)) (mag: 4)
	y3.Add(e.Add(&negX3).Mul(&c))          // Y3 = C*(E-X3)+Y3 (mag: 5)
	z3.Mul2(z1, &a)                        // Z3 = Z1*A (mag: 1)

	// Normalize the resulting field values to a magnitude of 1 as needed.
	x3.Normalize()
	y3.Normalize()
	z3.Normalize()
}

// addZ2EqualsOne adds two Jacobian points when the second point is already
// known to have a z value of 1 (and the z value for the first point is not 1)
// and stores the result in the provided result param.  That is to say result =
// p1 + p2.  It performs faster addition than the generic add routine since
// less arithmetic is needed due to the ability to avoid multiplications by the
// second point's z value.
//
// NOTE: The points must be normalized for this function to return the correct
// result.  The resulting point will be normalized.
func addZ2EqualsOne(p1, p2, result *JacobianPoint) {
	// To compute the point addition efficiently, this implementation splits
	// the equation into intermediate elements which are used to minimize
	// the number of field multiplications using the method shown at:
	// https://hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-0.html#addition-madd-2007-bl
	//
	// In particular it performs the calculations using the following:
	// Z1Z1 = Z1^2, U2 = X2*Z1Z1, S2 = Y2*Z1*Z1Z1, H = U2-X1, HH = H^2,
	// I = 4*HH, J = H*I, r = 2*(S2-Y1), V = X1*I
	// X3 = r^2-J-2*V, Y3 = r*(V-X3)-2*Y1*J, Z3 = (Z1+H)^2-Z1Z1-HH
	//
	// This results in a cost of 7 field multiplications, 4 field squarings,
	// 9 field additions, and 4 integer multiplications.
	x1, y1, z1 := &p1.X, &p1.Y, &p1.Z
	x2, y2 := &p2.X, &p2.Y
	x3, y3, z3 := &result.X, &result.Y, &result.Z

	// When the x coordinates are the same for two points on the curve, the
	// y coordinates either must be the same, in which case it is point
	// doubling, or they are opposite and the result is the point at
	// infinity per the group law for elliptic curve cryptography.  Since
	// any number of Jacobian coordinates can represent the same affine
	// point, the x and y values need to be converted to like terms.  Due to
	// the assumption made for this function that the second point has a z
	// value of 1 (z2=1), the first point is already "converted".
	var z1z1, u2, s2 FieldVal
	z1z1.SquareVal(z1)                        // Z1Z1 = Z1^2 (mag: 1)
	u2.Set(x2).Mul(&z1z1).Normalize()         // U2 = X2*Z1Z1 (mag: 1)
	s2.Set(y2).Mul(&z1z1).Mul(z1).Normalize() // S2 = Y2*Z1*Z1Z1 (mag: 1)
	if x1.Equals(&u2) {
		if y1.Equals(&s2) {
			// Since x1 == x2 and y1 == y2, point doubling must be
			// done, otherwise the addition would end up dividing
			// by zero.
			DoubleNonConst(p1, result)
			return
		}

		// Since x1 == x2 and y1 == -y2, the sum is the point at
		// infinity per the group law.
		x3.SetInt(0)
		y3.SetInt(0)
		z3.SetInt(0)
		return
	}

	// Calculate X3, Y3, and Z3 according to the intermediate elements
	// breakdown above.
	var h, hh, i, j, r, rr, v FieldVal
	var negX1, negY1, negX3 FieldVal
	negX1.Set(x1).Negate(1)                // negX1 = -X1 (mag: 2)
	h.Add2(&u2, &negX1)                    // H = U2-X1 (mag: 3)
	hh.SquareVal(&h)                       // HH = H^2 (mag: 1)
	i.Set(&hh).MulInt(4)                   // I = 4 * HH (mag: 4)
	j.Mul2(&h, &i)                         // J = H*I (mag: 1)
	negY1.Set(y1).Negate(1)                // negY1 = -Y1 (mag: 2)
	r.Set(&s2).Add(&negY1).MulInt(2)       // r = 2*(S2-Y1) (mag: 6)
	rr.SquareVal(&r)                       // rr = r^2 (mag: 1)
	v.Mul2(x1, &i)                         // V = X1*I (mag: 1)
	x3.Set(&v).MulInt(2).Add(&j).Negate(3) // X3 = -(J+2*V) (mag: 4)
	x3.Add(&rr)                            // X3 = r^2+X3 (mag: 5)
	negX3.Set(x3).Negate(5)                // negX3 = -X3 (mag: 6)
	y3.Set(y1).Mul(&j).MulInt(2).Negate(2) // Y3 = -(2*Y1*J) (mag: 3)
	y3.Add(v.Add(&negX3).Mul(&r))          // Y3 = r*(V-X3)+Y3 (mag: 4)
	z3.Add2(z1, &h).Square()               // Z3 = (Z1+H)^2 (mag: 1)
	z3.Add(z1z1.Add(&hh).Negate(2))        // Z3 = Z3-(Z1Z1+HH) (mag: 4)

	// Normalize the resulting field values to a magnitude of 1 as needed.
	x3.Normalize()
	y3.Normalize()
	z3.Normalize()
}

// addGeneric adds two Jacobian points without any assumptions about the z
// values of the two points and stores the result in the provided result param.
// That is to say result = p1 + p2.  It is the slowest of the add routines due
// to requiring the most arithmetic.
//
// NOTE: The points must be normalized for this function to return the correct
// result.  The resulting point will be normalized.
func addGeneric(p1, p2, result *JacobianPoint) {
	// To compute the point addition efficiently, this implementation splits
	// the equation into intermediate elements which are used to minimize
	// the number of field multiplications using the method shown at:
	// https://hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-0.html#addition-add-2007-bl
	//
	// In particular it performs the calculations using the following:
	// Z1Z1 = Z1^2, Z2Z2 = Z2^2, U1 = X1*Z2Z2, U2 = X2*Z1Z1, S1 = Y1*Z2*Z2Z2
	// S2 = Y2*Z1*Z1Z1, H = U2-U1, I = (2*H)^2, J = H*I, r = 2*(S2-S1)
	// V = U1*I
	// X3 = r^2-J-2*V, Y3 = r*(V-X3)-2*S1*J, Z3 = ((Z1+Z2)^2-Z1Z1-Z2Z2)*H
	//
	// This results in a cost of 11 field multiplications, 5 field squarings,
	// 9 field additions, and 4 integer multiplications.
	x1, y1, z1 := &p1.X, &p1.Y, &p1.Z
	x2, y2, z2 := &p2.X, &p2.Y, &p2.Z
	x3, y3, z3 := &result.X, &result.Y, &result.Z

	// When the x coordinates are the same for two points on the curve, the
	// y coordinates either must be the same, in which case it is point
	// doubling, or they are opposite and the result is the point at
	// infinity.  Since any number of Jacobian coordinates can represent the
	// same affine point, the x and y values need to be converted to like
	// terms.
	var z1z1, z2z2, u1, u2, s1, s2 FieldVal
	z1z1.SquareVal(z1)                        // Z1Z1 = Z1^2 (mag: 1)
	z2z2.SquareVal(z2)                        // Z2Z2 = Z2^2 (mag: 1)
	u1.Set(x1).Mul(&z2z2).Normalize()         // U1 = X1*Z2Z2 (mag: 1)
	u2.Set(x2).Mul(&z1z1).Normalize()         // U2 = X2*Z1Z1 (mag: 1)
	s1.Set(y1).Mul(&z2z2).Mul(z2).Normalize() // S1 = Y1*Z2*Z2Z2 (mag: 1)
	s2.Set(y2).Mul(&z1z1).Mul(z1).Normalize() // S2 = Y2*Z1*Z1Z1 (mag: 1)
	if u1.Equals(&u2) {
		if s1.Equals(&s2) {
			// Since x1 == x2 and y1 == y2, point doubling must be
			// done, otherwise the addition would end up dividing
			// by zero.
			DoubleNonConst(p1, result)
			return
		}

		// Since x1 == x2 and y1 == -y2, the sum is the point at
		// infinity per the group law.
		x3.SetInt(0)
		y3.SetInt(0)
		z3.SetInt(0)
		return
	}

	// Calculate X3, Y3, and Z3 according to the intermediate elements
	// breakdown above.
	var h, i, j, r, rr, v FieldVal
	var negU1, negS1, negX3 FieldVal
	negU1.Set(&u1).Negate(1)               // negU1 = -U1 (mag: 2)
	h.Add2(&u2, &negU1)                    // H = U2-U1 (mag: 3)
	i.Set(&h).MulInt(2).Square()           // I = (2*H)^2 (mag: 2)
	j.Mul2(&h, &i)                         // J = H*I (mag: 1)
	negS1.Set(&s1).Negate(1)               // negS1 = -S1 (mag: 2)
	r.Set(&s2).Add(&negS1).MulInt(2)       // r = 2*(S2-S1) (mag: 6)
	rr.SquareVal(&r)                       // rr = r^2 (mag: 1)
	v.Mul2(&u1, &i)                        // V = U1*I (mag: 1)
	x3.Set(&v).MulInt(2).Add(&j).Negate(3) // X3 = -(J+2*V) (mag: 4)
	x3.Add(&rr)                            // X3 = r^2+X3 (mag: 5)
	negX3.Set(x3).Negate(5)                // negX3 = -X3 (mag: 6)
	y3.Mul2(&s1, &j).MulInt(2).Negate(2)   // Y3 = -(2*S1*J) (mag: 3)
	y3.Add(v.Add(&negX3).Mul(&r))          // Y3 = r*(V-X3)+Y3 (mag: 4)
	z3.Add2(z1, z2).Square()               // Z3 = (Z1+Z2)^2 (mag: 1)
	z3.Add(z1z1.Add(&z2z2).Negate(2))      // Z3 = Z3-(Z1Z1+Z2Z2) (mag: 4)
	z3.Mul(&h)                             // Z3 = Z3*H (mag: 1)

	// Normalize the resulting field values to a magnitude of 1 as needed.
	x3.Normalize()
	y3.Normalize()
	z3.Normalize()
}

// AddNonConst adds the passed Jacobian points together and stores the result in
// the provided result param in *non-constant* time.
//
// NOTE: The points must be normalized for this function to return the correct
// result.  The resulting point will be normalized.
func AddNonConst(p1, p2, result *JacobianPoint) {
	// A point at infinity is the identity according to the group law for
	// elliptic curve cryptography.  Thus, ∞ + P = P and P + ∞ = P.
	if (p1.X.IsZero() && p1.Y.IsZero()) || p1.Z.IsZero() {
		result.Set(p2)
		return
	}
	if (p2.X.IsZero() && p2.Y.IsZero()) || p2.Z.IsZero() {
		result.Set(p1)
		return
	}

	// Faster point addition can be achieved when certain assumptions are
	// met.  For example, when both points have the same z value, arithmetic
	// on the z values can be avoided.  This section thus checks for these
	// conditions and calls an appropriate add function which is accelerated
	// by using those assumptions.
	isZ1One := p1.Z.IsOne()
	isZ2One := p2.Z.IsOne()
	switch {
	case isZ1One && isZ2One:
		addZ1AndZ2EqualsOne(p1, p2, result)
		return
	case p1.Z.Equals(&p2.Z):
		addZ1EqualsZ2(p1, p2, result)
		return
	case isZ2One:
		addZ2EqualsOne(p1, p2, result)
		return
	}

	// None of the above assumptions are true, so fall back to generic
	// point addition.
	addGeneric(p1, p2, result)
}

// doubleZ1EqualsOne performs point doubling on the passed Jacobian point when
// the point is already known to have a z value of 1 and stores the result in
// the provided result param.  That is to say result = 2*p.  It performs faster
// point doubling than the generic routine since less arithmetic is needed due
// to the ability to avoid multiplication by the z value.
//
// NOTE: The resulting point will be normalized.
func doubleZ1EqualsOne(p, result *JacobianPoint) {
	// This function uses the assumptions that z1 is 1, thus the point
	// doubling formulas reduce to:
	//
	// X3 = (3*X1^2)^2 - 8*X1*Y1^2
	// Y3 = (3*X1^2)*(4*X1*Y1^2 - X3) - 8*Y1^4
	// Z3 = 2*Y1
	//
	// To compute the above efficiently, this implementation splits the
	// equation into intermediate elements which are used to minimize the
	// number of field multiplications in favor of field squarings which
	// are roughly 35% faster than field multiplications with the current
	// implementation at the time this was written.
	//
	// This uses a slightly modified version of the method shown at:
	// https://hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-0.html#doubling-mdbl-2007-bl
	//
	// In particular it performs the calculations using the following:
	// A = X1^2, B = Y1^2, C = B^2, D = 2*((X1+B)^2-A-C)
	// E = 3*A, F = E^2, X3 = F-2*D, Y3 = E*(D-X3)-8*C
	// Z3 = 2*Y1
	//
	// This results in a cost of 1 field multiplication, 5 field squarings,
	// 6 field additions, and 5 integer multiplications.
	x1, y1 := &p.X, &p.Y
	x3, y3, z3 := &result.X, &result.Y, &result.Z
	var a, b, c, d, e, f FieldVal
	z3.Set(y1).MulInt(2)                     // Z3 = 2*Y1 (mag: 2)
	a.SquareVal(x1)                          // A = X1^2 (mag: 1)
	b.SquareVal(y1)                          // B = Y1^2 (mag: 1)
	c.SquareVal(&b)                          // C = B^2 (mag: 1)
	b.Add(x1).Square()                       // B = (X1+B)^2 (mag: 1)
	d.Set(&a).Add(&c).Negate(2)              // D = -(A+C) (mag: 3)
	d.Add(&b).MulInt(2)                      // D = 2*(B+D)(mag: 8)
	e.Set(&a).MulInt(3)                      // E = 3*A (mag: 3)
	f.SquareVal(&e)                          // F = E^2 (mag: 1)
	x3.Set(&d).MulInt(2).Negate(16)          // X3 = -(2*D) (mag: 17)
	x3.Add(&f)                               // X3 = F+X3 (mag: 18)
	f.Set(x3).Negate(18).Add(&d).Normalize() // F = D-X3 (mag: 1)
	y3.Set(&c).MulInt(8).Negate(8)           // Y3 = -(8*C) (mag: 9)
	y3.Add(f.Mul(&e))                        // Y3 = E*F+Y3 (mag: 10)

	// Normalize the field values back to a magnitude of 1.
	x3.Normalize()
	y3.Normalize()
	z3.Normalize()
}

// doubleGeneric performs point doubling on the passed Jacobian point without
// any assumptions about the z value and stores the result in the provided
// result param.  That is to say result = 2*p.  It is the slowest of the point
// doubling routines due to requiring the most arithmetic.
//
// NOTE: The resulting point will be normalized.
func doubleGeneric(p, result *JacobianPoint) {
	// Point doubling formula for Jacobian coordinates for the secp256k1
	// curve:
	//
	// X3 = (3*X1^2)^2 - 8*X1*Y1^2
	// Y3 = (3*X1^2)*(4*X1*Y1^2 - X3) - 8*Y1^4
	// Z3 = 2*Y1*Z1
	//
	// To compute the above efficiently, this implementation splits the
	// equation into intermediate elements which are used to minimize the
	// number of field multiplications in favor of field squarings which
	// are roughly 35% faster than field multiplications with the current
	// implementation at the time this was written.
	//
	// This uses a slightly modified version of the method shown at:
	// https://hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-0.html#doubling-dbl-2009-l
	//
	// In particular it performs the calculations using the following:
	// A = X1^2, B = Y1^2, C = B^2, D = 2*((X1+B)^2-A-C)
	// E = 3*A, F = E^2, X3 = F-2*D, Y3 = E*(D-X3)-8*C
	// Z3 = 2*Y1*Z1
	//
	// This results in a cost of 1 field multiplication, 5 field squarings,
	// 6 field additions, and 5 integer multiplications.
	x1, y1, z1 := &p.X, &p.Y, &p.Z
	x3, y3, z3 := &result.X, &result.Y, &result.Z
	var a, b, c, d, e, f FieldVal
	z3.Mul2(y1, z1).MulInt(2)                // Z3 = 2*Y1*Z1 (mag: 2)
	a.SquareVal(x1)                          // A = X1^2 (mag: 1)
	b.SquareVal(y1)                          // B = Y1^2 (mag: 1)
	c.SquareVal(&b)                          // C = B^2 (mag: 1)
	b.Add(x1).Square()                       // B = (X1+B)^2 (mag: 1)
	d.Set(&a).Add(&c).Negate(2)              // D = -(A+C) (mag: 3)
	d.Add(&b).MulInt(2)                      // D = 2*(B+D)(mag: 8)
	e.Set(&a).MulInt(3)                      // E = 3*A (mag: 3)
	f.SquareVal(&e)                          // F = E^2 (mag: 1)
	x3.Set(&d).MulInt(2).Negate(16)          // X3 = -(2*D) (mag: 17)
	x3.Add(&f)                               // X3 = F+X3 (mag: 18)
	f.Set(x3).Negate(18).Add(&d).Normalize() // F = D-X3 (mag: 1)
	y3.Set(&c).MulInt(8).Negate(8)           // Y3 = -(8*C) (mag: 9)
	y3.Add(f.Mul(&e))                        // Y3 = E*F+Y3 (mag: 10)

	// Normalize the field values back to a magnitude of 1.
	x3.Normalize()
	y3.Normalize()
	z3.Normalize()
}

// DoubleNonConst doubles the passed Jacobian point and stores the result in the
// provided result parameter in *non-constant* time.
//
// NOTE: The point must be normalized for this function to return the correct
// result.  The resulting point will be normalized.
func DoubleNonConst(p, result *JacobianPoint) {
	// Doubling a point at infinity is still infinity.
	if p.Y.IsZero() || p.Z.IsZero() {
		result.X.SetInt(0)
		result.Y.SetInt(0)
		result.Z.SetInt(0)
		return
	}

	// Slightly faster point doubling can be achieved when the z value is 1
	// by avoiding the multiplication on the z value.  This section calls
	// a point doubling function which is accelerated by using that
	// assumption when possible.
	if p.Z.IsOne() {
		doubleZ1EqualsOne(p, result)
		return
	}

	// Fall back to generic point doubling which works with arbitrary z
	// values.
	doubleGeneric(p, result)
}

// splitK returns a balanced length-two representation of k and their signs.
// This is algorithm 3.74 from [GECC].
//
// One thing of note about this algorithm is that no matter what c1 and c2 are,
// the final equation of k = k1 + k2 * lambda (mod n) will hold.  This is
// provable mathematically due to how a1/b1/a2/b2 are computed.
//
// c1 and c2 are chosen to minimize the max(k1,k2).
func splitK(k []byte) ([]byte, []byte, int, int) {
	// All math here is done with big.Int, which is slow.
	// At some point, it might be useful to write something similar to
	// FieldVal but for N instead of P as the prime field if this ends up
	// being a bottleneck.
	bigIntK := new(big.Int)
	c1, c2 := new(big.Int), new(big.Int)
	tmp1, tmp2 := new(big.Int), new(big.Int)
	k1, k2 := new(big.Int), new(big.Int)

	bigIntK.SetBytes(k)
	// c1 = round(b2 * k / n) from step 4.
	// Rounding isn't really necessary and costs too much, hence skipped
	c1.Mul(endomorphismB2, bigIntK)
	c1.Div(c1, curveParams.N)
	// c2 = round(b1 * k / n) from step 4 (sign reversed to optimize one step)
	// Rounding isn't really necessary and costs too much, hence skipped
	c2.Mul(endomorphismB1, bigIntK)
	c2.Div(c2, curveParams.N)
	// k1 = k - c1 * a1 - c2 * a2 from step 5 (note c2's sign is reversed)
	tmp1.Mul(c1, endomorphismA1)
	tmp2.Mul(c2, endomorphismA2)
	k1.Sub(bigIntK, tmp1)
	k1.Add(k1, tmp2)
	// k2 = - c1 * b1 - c2 * b2 from step 5 (note c2's sign is reversed)
	tmp1.Mul(c1, endomorphismB1)
	tmp2.Mul(c2, endomorphismB2)
	k2.Sub(tmp2, tmp1)

	// Note Bytes() throws out the sign of k1 and k2. This matters
	// since k1 and/or k2 can be negative. Hence, we pass that
	// back separately.
	return k1.Bytes(), k2.Bytes(), k1.Sign(), k2.Sign()
}

// ScalarMultNonConst multiplies k*P where k is a big endian integer modulo the
// curve order and P is a point in Jacobian projective coordinates and stores
// the result in the provided Jacobian point.
//
// NOTE: The point must be normalized for this function to return the correct
// result.  The resulting point will be normalized.
func ScalarMultNonConst(k *ModNScalar, point, result *JacobianPoint) {
	// Decompose K into k1 and k2 in order to halve the number of EC ops.
	// See Algorithm 3.74 in [GECC].
	kBytes := k.Bytes()
	k1, k2, signK1, signK2 := splitK(kBytes[:])
	zeroArray32(&kBytes)

	// The main equation here to remember is:
	//   k * P = k1 * P + k2 * ϕ(P)
	//
	// P1 below is P in the equation, P2 below is ϕ(P) in the equation
	p1, p1Neg := new(JacobianPoint), new(JacobianPoint)
	p1.Set(point)
	p1Neg.Set(p1)
	p1Neg.Y.Negate(1).Normalize()

	// NOTE: ϕ(x,y) = (βx,y).  The Jacobian z coordinates are the same, so this
	// math goes through.
	p2, p2Neg := new(JacobianPoint), new(JacobianPoint)
	p2.Set(p1)
	p2.X.Mul(endomorphismBeta).Normalize()
	p2Neg.Set(p2)
	p2Neg.Y.Negate(1).Normalize()

	// Flip the positive and negative values of the points as needed
	// depending on the signs of k1 and k2.  As mentioned in the equation
	// above, each of k1 and k2 are multiplied by the respective point.
	// Since -k * P is the same thing as k * -P, and the group law for
	// elliptic curves states that P(x, y) = -P(x, -y), it's faster and
	// simplifies the code to just make the point negative.
	if signK1 == -1 {
		p1, p1Neg = p1Neg, p1
	}
	if signK2 == -1 {
		p2, p2Neg = p2Neg, p2
	}

	// NAF versions of k1 and k2 should have a lot more zeros.
	//
	// The Pos version of the bytes contain the +1s and the Neg versions
	// contain the -1s.
	k1PosNAF, k1NegNAF := naf(k1)
	k2PosNAF, k2NegNAF := naf(k2)
	k1Len := len(k1PosNAF)
	k2Len := len(k2PosNAF)

	m := k1Len
	if m < k2Len {
		m = k2Len
	}

	// Point Q = ∞ (point at infinity).
	var q JacobianPoint

	// Add left-to-right using the NAF optimization.  See algorithm 3.77
	// from [GECC].  This should be faster overall since there will be a lot
	// more instances of 0, hence reducing the number of Jacobian additions
	// at the cost of 1 possible extra doubling.
	var k1BytePos, k1ByteNeg, k2BytePos, k2ByteNeg byte
	for i := 0; i < m; i++ {
		// Since we're going left-to-right, pad the front with 0s.
		if i < m-k1Len {
			k1BytePos = 0
			k1ByteNeg = 0
		} else {
			k1BytePos = k1PosNAF[i-(m-k1Len)]
			k1ByteNeg = k1NegNAF[i-(m-k1Len)]
		}
		if i < m-k2Len {
			k2BytePos = 0
			k2ByteNeg = 0
		} else {
			k2BytePos = k2PosNAF[i-(m-k2Len)]
			k2ByteNeg = k2NegNAF[i-(m-k2Len)]
		}

		for j := 7; j >= 0; j-- {
			// Q = 2 * Q
			DoubleNonConst(&q, &q)

			if k1BytePos&0x80 == 0x80 {
				AddNonConst(&q, p1, &q)
			} else if k1ByteNeg&0x80 == 0x80 {
				AddNonConst(&q, p1Neg, &q)
			}

			if k2BytePos&0x80 == 0x80 {
				AddNonConst(&q, p2, &q)
			} else if k2ByteNeg&0x80 == 0x80 {
				AddNonConst(&q, p2Neg, &q)
			}
			k1BytePos <<= 1
			k1ByteNeg <<= 1
			k2BytePos <<= 1
			k2ByteNeg <<= 1
		}
	}

	result.Set(&q)
}

// ScalarBaseMultNonConst multiplies k*G where G is the base point of the group
// and k is a big endian integer.  The result is stored in Jacobian coordinates
// (x1, y1, z1).
//
// NOTE: The resulting point will be normalized.
func ScalarBaseMultNonConst(k *ModNScalar, result *JacobianPoint) {
	bytePoints := S256().bytePoints

	// Point Q = ∞ (point at infinity).
	var q JacobianPoint

	// curve.bytePoints has all 256 byte points for each 8-bit window.  The
	// strategy is to add up the byte points.  This is best understood by
	// expressing k in base-256 which it already sort of is.  Each "digit" in
	// the 8-bit window can be looked up using bytePoints and added together.
	var pt JacobianPoint
	for i, byteVal := range k.Bytes() {
		p := bytePoints[i][byteVal]
		pt.X.Set(&p[0])
		pt.Y.Set(&p[1])
		pt.Z.Set(&p[2])
		AddNonConst(&q, &pt, &q)
	}

	result.Set(&q)
}

// naf takes a positive integer k and returns the Non-Adjacent Form (NAF) as two
// byte slices.  The first is where 1s will be.  The second is where -1s will
// be.  NAF is convenient in that on average, only 1/3rd of its values are
// non-zero.  This is algorithm 3.30 from [GECC].
//
// Essentially, this makes it possible to minimize the number of operations
// since the resulting ints returned will be at least 50% 0s.
func naf(k []byte) ([]byte, []byte) {
	// The essence of this algorithm is that whenever we have consecutive 1s
	// in the binary, we want to put a -1 in the lowest bit and get a bunch
	// of 0s up to the highest bit of consecutive 1s.  This is due to this
	// identity:
	// 2^n + 2^(n-1) + 2^(n-2) + ... + 2^(n-k) = 2^(n+1) - 2^(n-k)
	//
	// The algorithm thus may need to go 1 more bit than the length of the
	// bits we actually have, hence bits being 1 bit longer than was
	// necessary.  Since we need to know whether adding will cause a carry,
	// we go from right-to-left in this addition.
	var carry, curIsOne, nextIsOne bool
	// these default to zero
	retPos := make([]byte, len(k)+1)
	retNeg := make([]byte, len(k)+1)
	for i := len(k) - 1; i >= 0; i-- {
		curByte := k[i]
		for j := uint(0); j < 8; j++ {
			curIsOne = curByte&1 == 1
			if j == 7 {
				if i == 0 {
					nextIsOne = false
				} else {
					nextIsOne = k[i-1]&1 == 1
				}
			} else {
				nextIsOne = curByte&2 == 2
			}
			if carry {
				if curIsOne {
					// This bit is 1, so continue to carry
					// and don't need to do anything.
				} else {
					// We've hit a 0 after some number of
					// 1s.
					if nextIsOne {
						// Start carrying again since
						// a new sequence of 1s is
						// starting.
						retNeg[i+1] += 1 << j
					} else {
						// Stop carrying since 1s have
						// stopped.
						carry = false
						retPos[i+1] += 1 << j
					}
				}
			} else if curIsOne {
				if nextIsOne {
					// If this is the start of at least 2
					// consecutive 1s, set the current one
					// to -1 and start carrying.
					retNeg[i+1] += 1 << j
					carry = true
				} else {
					// This is a singleton, not consecutive
					// 1s.
					retPos[i+1] += 1 << j
				}
			}
			curByte >>= 1
		}
	}
	if carry {
		retPos[0] = 1
		return retPos, retNeg
	}
	return retPos[1:], retNeg[1:]
}

// isOnCurve returns whether or not the affine point (x,y) is on the curve.
func isOnCurve(fx, fy *FieldVal) bool {
	// Elliptic curve equation for secp256k1 is: y^2 = x^3 + 7
	y2 := new(FieldVal).SquareVal(fy).Normalize()
	result := new(FieldVal).SquareVal(fx).Mul(fx).AddInt(7).Normalize()
	return y2.Equals(result)
}

// DecompressY attempts to calculate the Y coordinate for the given X coordinate
// such that the result pair is a point on the secp256k1 curve.  It adjusts Y
// based on the desired oddness and returns whether or not it was successful
// since not all X coordinates are valid.
//
// The magnitude of the provided X coordinate field val must be a max of 8 for a
// correct result.  The resulting Y field val will have a max magnitude of 2.
func DecompressY(x *FieldVal, odd bool, resultY *FieldVal) bool {
	// The curve equation for secp256k1 is: y^2 = x^3 + 7.  Thus
	// y = +-sqrt(x^3 + 7).
	//
	// The x coordinate must be invalid if there is no square root for the
	// calculated rhs because it means the X coordinate is not for a point on
	// the curve.
	x3PlusB := new(FieldVal).SquareVal(x).Mul(x).AddInt(7)
	if hasSqrt := resultY.SquareRootVal(x3PlusB); !hasSqrt {
		return false
	}
	if resultY.Normalize().IsOdd() != odd {
		resultY.Negate(1)
	}
	return true
}
