package util

import "unicode"

func Map[S ~[]T, T any, R any](arr S, mappingFunc func(int) R) []R {
	total := len(arr)
	result := make([]R, total)
	for i := 0; i < total; i++ {
		result[i] = mappingFunc(i)
	}
	return result
}

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
	rs := []rune(str)
	for _, r := range rs {
		if r == unicode.ReplacementChar {
			return true
		}
		if !unicode.IsPrint(r) && !unicode.IsSpace(r) {
			return true
		}
	}
	return false
}
