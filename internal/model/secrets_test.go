package model

import (
	"testing"

	scorixsecrets "github.com/tradalab/scorix/secrets"
)

func TestSealSecretIdempotentAndHeal(t *testing.T) {
	store, err := scorixsecrets.NewWithKey(make([]byte, 32))
	if err != nil {
		t.Fatal(err)
	}
	SetSecretCodec(store)
	t.Cleanup(func() { SetSecretCodec(nil) })

	enc, err := sealSecret("hunter2")
	if err != nil {
		t.Fatal(err)
	}
	if !scorixsecrets.IsEncrypted(enc) {
		t.Fatalf("sealSecret did not seal: %q", enc)
	}

	again, err := sealSecret(enc)
	if err != nil {
		t.Fatal(err)
	}
	if again != enc {
		t.Fatalf("sealSecret re-sealed a token: %q != %q", again, enc)
	}

	double, err := store.EncryptString(enc)
	if err != nil {
		t.Fatal(err)
	}
	got, err := openSecret(double)
	if err != nil {
		t.Fatal(err)
	}
	if got != "hunter2" {
		t.Fatalf("openSecret did not heal double seal: got %q", got)
	}

	// An undecryptable token must not error (a bad row mustn't hide the list).
	bad := "scorix:v1:not-a-real-token"
	got, err = openSecret(bad)
	if err != nil {
		t.Fatalf("openSecret errored on a bad token: %v", err)
	}
	if got != bad {
		t.Fatalf("openSecret should keep the bad token as-is, got %q", got)
	}
}
