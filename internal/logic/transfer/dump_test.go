package transfer

import (
	"math"
	"testing"
)

func TestBlobKeepsTextAndWrapsBinary(t *testing.T) {
	if got := blob("user:1"); got != "user:1" {
		t.Fatalf("text = %v", got)
	}
	got, ok := blob("\xff\x00a").(map[string]string)
	if !ok || got["$b64"] != "/wBh" {
		t.Fatalf("binary = %v", got)
	}
}

func TestScoreSpellsInfinityForZadd(t *testing.T) {
	if score(math.Inf(1)) != "+inf" || score(math.Inf(-1)) != "-inf" || score(1.5) != 1.5 {
		t.Fatal("score mapping")
	}
}

func TestNextStreamIDCarriesIntoMilliseconds(t *testing.T) {
	cases := map[string]string{"5-0": "5-1", "5-18446744073709551615": "6-0"}
	for in, want := range cases {
		if got := nextStreamID(in); got != want {
			t.Errorf("%s -> %s, want %s", in, got, want)
		}
	}
}
