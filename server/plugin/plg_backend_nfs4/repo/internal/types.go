package internal

//goland:noinspection GoSnakeCaseUsage
type Uint32_t = uint32
//goland:noinspection GoSnakeCaseUsage
type Uint64_t = uint64
//goland:noinspection GoSnakeCaseUsage
type Int64_t = int64

//goland:noinspection GoSnakeCaseUsage
type XDR_Uint32_t = *XdrUint32
//goland:noinspection GoSnakeCaseUsage
type XdrType_Uint32_t = XdrType_uint32
//goland:noinspection GoSnakeCaseUsage
type XDR_Uint64_t = *XdrUint64
//goland:noinspection GoSnakeCaseUsage
type XdrType_Uint64_t = XdrType_uint64
//goland:noinspection GoSnakeCaseUsage
type XdrType_Int64_t = XdrType_int64
//goland:noinspection GoSnakeCaseUsage
type XDR_Int64_t = *XdrInt64

func MinUint64(i1, i2 uint64) uint64 {
	if i1 < i2 {
		return i1
	}
	return i2
}