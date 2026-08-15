package keyfilter

import "testing"

func TestGlobMatch(t *testing.T) {
	cases := []struct {
		pattern, s string
		want       bool
	}{
		{"*", "anything", true},
		{"*", "", true},
		{"user:*", "user:1", true},
		{"user:*", "users:1", false}, // the ':' in the pattern still has to match
		{"user:*", "usr:1", false},
		{"user:*", "user:", true},
		{"user:?", "user:1", true},
		{"user:?", "user:12", false},
		{"user:[0-9]", "user:7", true},
		{"user:[0-9]", "user:a", false},
		{"user:[^0-9]", "user:a", true},
		{"user:[^0-9]", "user:7", false},
		{"a**b", "axxb", true},
		{"*b", "b", true},
		{"a*", "a", true},
		{`a\*b`, "a*b", true},
		{`a\*b`, "axb", false},
		{"", "", true},
		{"", "x", false},
		// The reason path.Match is not usable: '*' has to cross a slash.
		{"cache:*", "cache:a/b/c", true},
		{"*/*", "a/b", true},
	}

	for _, c := range cases {
		if got := globMatch(c.pattern, c.s); got != c.want {
			t.Errorf("globMatch(%q, %q) = %v, want %v", c.pattern, c.s, got, c.want)
		}
	}
}

func TestMatchIncludeExclude(t *testing.T) {
	tests := []struct {
		name     string
		clauses  []Clause
		matchAll bool
		match    []string
		reject   []string
	}{
		{
			name:    "no clauses admits everything",
			match:   []string{"a", "b:c", ""},
			reject:  nil,
			clauses: nil,
		},
		{
			name:    "exclude only",
			clauses: []Clause{{Pattern: "session:*", Exclude: true}},
			match:   []string{"user:1", "cache:x"},
			reject:  []string{"session:abc"},
		},
		{
			name: "OR of two includes",
			clauses: []Clause{
				{Pattern: "user:*"},
				{Pattern: "order:*"},
			},
			match:  []string{"user:1", "order:9"},
			reject: []string{"cache:1"},
		},
		{
			name:     "AND of glob and substring",
			matchAll: true,
			clauses: []Clause{
				{Pattern: "user:*"},
				{Pattern: "admin", Mode: ModeSubstring},
			},
			match:  []string{"user:admin:1"},
			reject: []string{"user:1", "admin:1"},
		},
		{
			name: "exclude wins over include",
			clauses: []Clause{
				{Pattern: "user:*"},
				{Pattern: "*:tmp", Exclude: true},
			},
			match:  []string{"user:1"},
			reject: []string{"user:1:tmp"},
		},
		{
			name:    "regex",
			clauses: []Clause{{Pattern: `^user:\d+$`, Mode: ModeRegex}},
			match:   []string{"user:42"},
			reject:  []string{"user:abc", "xuser:42"},
		},
		{
			name:    "ignore case glob",
			clauses: []Clause{{Pattern: "USER:*", IgnoreCase: true}},
			match:   []string{"user:1", "UsEr:2"},
			reject:  []string{"order:1"},
		},
		{
			name:    "ignore case substring",
			clauses: []Clause{{Pattern: "ADMIN", Mode: ModeSubstring, IgnoreCase: true}},
			match:   []string{"user:admin:1"},
			reject:  []string{"user:1"},
		},
		{
			name:    "ignore case regex",
			clauses: []Clause{{Pattern: "^USER:", Mode: ModeRegex, IgnoreCase: true}},
			match:   []string{"user:1"},
			reject:  []string{"order:1"},
		},
		{
			name:    "empty pattern is not a filter",
			clauses: []Clause{{Pattern: ""}},
			match:   []string{"anything"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s, err := Compile(tt.clauses, tt.matchAll)
			if err != nil {
				t.Fatalf("Compile: %v", err)
			}
			for _, k := range tt.match {
				if !s.Match(k) {
					t.Errorf("Match(%q) = false, want true", k)
				}
			}
			for _, k := range tt.reject {
				if s.Match(k) {
					t.Errorf("Match(%q) = true, want false", k)
				}
			}
		})
	}
}

func TestCompileRejectsBadInput(t *testing.T) {
	if _, err := Compile([]Clause{{Pattern: "user:[", Mode: ModeRegex}}, false); err == nil {
		t.Error("expected an error for an invalid regex")
	}
	if _, err := Compile([]Clause{{Pattern: "x", Mode: "fuzzy"}}, false); err == nil {
		t.Error("expected an error for an unknown mode")
	}
	// RE2 has no lookahead. The browser's RegExp accepts this one, which is
	// exactly why the server has to be the one that validates.
	if _, err := Compile([]Clause{{Pattern: `^(?!tmp)`, Mode: ModeRegex}}, false); err == nil {
		t.Error("expected RE2 to reject lookahead")
	}
}

func TestPushdown(t *testing.T) {
	tests := []struct {
		name     string
		clauses  []Clause
		matchAll bool
		want     string
	}{
		{name: "no filter", want: "*"},
		{name: "single glob goes over verbatim", clauses: []Clause{{Pattern: "user:*"}}, want: "user:*"},
		{
			name:    "single case-insensitive glob cannot be pushed",
			clauses: []Clause{{Pattern: "user:*", IgnoreCase: true}},
			want:    "*",
		},
		{
			name:    "substring has no prefix",
			clauses: []Clause{{Pattern: "admin", Mode: ModeSubstring}},
			want:    "*",
		},
		{
			name:    "anchored regex yields its literal head",
			clauses: []Clause{{Pattern: `^user:\d+$`, Mode: ModeRegex}},
			want:    "user:*",
		},
		{
			name:    "unanchored regex yields nothing",
			clauses: []Clause{{Pattern: `user:\d+`, Mode: ModeRegex}},
			want:    "*",
		},
		{
			name:    "OR takes the common prefix",
			clauses: []Clause{{Pattern: "user:a*"}, {Pattern: "user:b*"}},
			want:    "user:*",
		},
		{
			name:    "OR with a disjoint clause gives up",
			clauses: []Clause{{Pattern: "user:*"}, {Pattern: "order:*"}},
			want:    "*",
		},
		{
			name:     "AND takes the longest prefix",
			matchAll: true,
			clauses:  []Clause{{Pattern: "user:*"}, {Pattern: "user:admin:*"}},
			want:     "user:admin:*",
		},
		{
			name:     "AND ignores an unusable clause",
			matchAll: true,
			clauses:  []Clause{{Pattern: "user:*"}, {Pattern: "admin", Mode: ModeSubstring}},
			want:     "user:*",
		},
		{
			name:    "excludes never narrow the scan",
			clauses: []Clause{{Pattern: "session:*", Exclude: true}},
			want:    "*",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s, err := Compile(tt.clauses, tt.matchAll)
			if err != nil {
				t.Fatalf("Compile: %v", err)
			}
			if got := s.Pushdown(); got != tt.want {
				t.Errorf("Pushdown() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestPushdownIsASuperset(t *testing.T) {
	keys := []string{
		"user:1", "user:2", "user:admin:1", "USER:1", "order:1", "order:2",
		"session:abc", "cache:a/b", "", "u", "user:", "userx",
	}

	sets := []struct {
		clauses  []Clause
		matchAll bool
	}{
		{clauses: []Clause{{Pattern: "user:*"}}},
		{clauses: []Clause{{Pattern: "user:*"}, {Pattern: "order:*"}}},
		{clauses: []Clause{{Pattern: "user:a*"}, {Pattern: "user:b*"}}},
		{clauses: []Clause{{Pattern: "user:*"}, {Pattern: "user:admin:*"}}, matchAll: true},
		{clauses: []Clause{{Pattern: "user:*", IgnoreCase: true}}},
		{clauses: []Clause{{Pattern: `^user:\d+$`, Mode: ModeRegex}}},
		{clauses: []Clause{{Pattern: "admin", Mode: ModeSubstring}}},
		{clauses: []Clause{{Pattern: "user:*"}, {Pattern: "*:tmp", Exclude: true}}},
	}

	for i, tc := range sets {
		s, err := Compile(tc.clauses, tc.matchAll)
		if err != nil {
			t.Fatalf("set %d: Compile: %v", i, err)
		}
		push := s.Pushdown()
		for _, k := range keys {
			if s.Match(k) && !globMatch(push, k) {
				t.Errorf("set %d: key %q matches the filter but Pushdown %q would have hidden it", i, k, push)
			}
		}
	}
}
