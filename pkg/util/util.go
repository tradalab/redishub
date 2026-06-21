package util

import "unicode"

func EncodeRedisKey(key string) any {
	if ContainsBinary(key) {
		b := []byte(key)
		arr := make([]int, len(b))
		for i, bb := range b {
			arr[i] = int(bb)
		}
		return arr
	}
	return key
}

func ContainsBinary(str string) bool {
	for _, r := range str {
		if r == unicode.ReplacementChar {
			return true
		}
		if !unicode.IsPrint(r) && !unicode.IsSpace(r) {
			return true
		}
	}
	return false
}
