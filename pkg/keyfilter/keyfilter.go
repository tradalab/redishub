package keyfilter

import (
	"fmt"
	"regexp"
	"strings"
)

const (
	ModeGlob      = "glob"
	ModeRegex     = "regex"
	ModeSubstring = "substring"
)

type Clause struct {
	Pattern    string
	Mode       string
	Exclude    bool
	IgnoreCase bool
}

type matcher struct {
	mode       string
	raw        string
	ignoreCase bool
	folded     string
	re         *regexp.Regexp
}

type Set struct {
	includes []matcher
	excludes []matcher
	matchAll bool
	anyFold  bool
}

func Compile(clauses []Clause, matchAll bool) (*Set, error) {
	s := &Set{matchAll: matchAll}

	for i, c := range clauses {
		if c.Pattern == "" {
			continue
		}

		m := matcher{mode: c.Mode, raw: c.Pattern, ignoreCase: c.IgnoreCase}
		if m.mode == "" {
			m.mode = ModeGlob
		}

		switch m.mode {
		case ModeGlob, ModeSubstring:
			if c.IgnoreCase {
				m.folded = strings.ToLower(c.Pattern)
				s.anyFold = true
			}
		case ModeRegex:
			pattern := c.Pattern
			if c.IgnoreCase {
				pattern = "(?i)" + pattern
			}
			re, err := regexp.Compile(pattern)
			if err != nil {
				return nil, fmt.Errorf("filter %d (%q): %w", i+1, c.Pattern, err)
			}
			m.re = re
		default:
			return nil, fmt.Errorf("filter %d: unknown mode %q", i+1, c.Mode)
		}

		if c.Exclude {
			s.excludes = append(s.excludes, m)
		} else {
			s.includes = append(s.includes, m)
		}
	}

	return s, nil
}

func (s *Set) Match(key string) bool {
	folded := ""
	if s.anyFold {
		folded = strings.ToLower(key)
	}

	for _, m := range s.excludes {
		if m.match(key, folded) {
			return false
		}
	}

	if len(s.includes) == 0 {
		return true
	}

	if s.matchAll {
		for _, m := range s.includes {
			if !m.match(key, folded) {
				return false
			}
		}
		return true
	}

	for _, m := range s.includes {
		if m.match(key, folded) {
			return true
		}
	}
	return false
}

func (m matcher) match(key, folded string) bool {
	switch m.mode {
	case ModeRegex:
		return m.re.MatchString(key)
	case ModeSubstring:
		if m.ignoreCase {
			return strings.Contains(folded, m.folded)
		}
		return strings.Contains(key, m.raw)
	default:
		if m.ignoreCase {
			return globMatch(m.folded, folded)
		}
		return globMatch(m.raw, key)
	}
}

func (s *Set) Pushdown() string {
	if len(s.includes) == 0 {
		return "*"
	}

	if len(s.includes) == 1 {
		m := s.includes[0]
		if m.mode == ModeGlob && !m.ignoreCase {
			return m.raw
		}
	}

	if s.matchAll {
		longest := ""
		for _, m := range s.includes {
			if p := m.literalPrefix(); len(p) > len(longest) {
				longest = p
			}
		}
		if longest != "" {
			return longest + "*"
		}
		return "*"
	}

	common := ""
	for i, m := range s.includes {
		p := m.literalPrefix()
		if p == "" {
			return "*" // one unanchored clause and the union is unbounded
		}
		if i == 0 {
			common = p
			continue
		}
		common = commonPrefix(common, p)
		if common == "" {
			return "*"
		}
	}
	return common + "*"
}

func (m matcher) literalPrefix() string {
	if m.ignoreCase {
		return ""
	}

	switch m.mode {
	case ModeSubstring:
		return "" // a substring may sit anywhere in the key
	case ModeRegex:
		// Only an anchored pattern says anything about the start of the key.
		if !strings.HasPrefix(m.raw, "^") {
			return ""
		}
		return literalRun(m.raw[1:], regexMeta)
	default:
		return literalRun(m.raw, globMeta)
	}
}

const (
	globMeta  = `*?[\`
	regexMeta = `.+*?()|[]{}^$\`
)

func literalRun(pattern, meta string) string {
	for i := 0; i < len(pattern); i++ {
		if strings.IndexByte(meta, pattern[i]) >= 0 {
			return pattern[:i]
		}
	}
	return pattern
}

func commonPrefix(a, b string) string {
	n := min(len(a), len(b))
	for i := range n {
		if a[i] != b[i] {
			return a[:i]
		}
	}
	return a[:n]
}

// globMatch implements Redis' own glob (the stringmatchlen in util.c): `*`, `?`,
// `[...]` with `[^...]` negation and `a-z` ranges, and `\` escaping. Go's
// path.Match is NOT a substitute — there `*` refuses to cross a `/`, which would
// silently drop every key with a slash in it.
func globMatch(pattern, s string) bool {
	p, k := 0, 0

	for p < len(pattern) {
		switch pattern[p] {
		case '*':
			// Collapse runs of '*' so "a**b" costs no more than "a*b".
			for p+1 < len(pattern) && pattern[p+1] == '*' {
				p++
			}
			if p+1 == len(pattern) {
				return true
			}
			for i := k; i <= len(s); i++ {
				if globMatch(pattern[p+1:], s[i:]) {
					return true
				}
			}
			return false

		case '?':
			if k == len(s) {
				return false
			}
			k++
			p++

		case '[':
			if k == len(s) {
				return false
			}
			p++
			negate := p < len(pattern) && pattern[p] == '^'
			if negate {
				p++
			}
			match := false
			for {
				if p == len(pattern) {
					// Unterminated class. Redis treats it as a literal run rather
					// than an error, and so do we — the user is mid-typing.
					p--
					break
				}
				if pattern[p] == '\\' && p+1 < len(pattern) {
					p++
					if pattern[p] == s[k] {
						match = true
					}
				} else if pattern[p] == ']' {
					break
				} else if p+2 < len(pattern) && pattern[p+1] == '-' && pattern[p+2] != ']' {
					lo, hi := pattern[p], pattern[p+2]
					if lo > hi {
						lo, hi = hi, lo
					}
					if s[k] >= lo && s[k] <= hi {
						match = true
					}
					p += 2
				} else if pattern[p] == s[k] {
					match = true
				}
				p++
			}
			if negate {
				match = !match
			}
			if !match {
				return false
			}
			k++
			p++

		case '\\':
			if p+1 < len(pattern) {
				p++
			}
			fallthrough

		default:
			if k == len(s) || pattern[p] != s[k] {
				return false
			}
			k++
			p++
		}

		// Pattern exhausted before the key: only a trailing '*' could still save it.
		if k == len(s) {
			for p < len(pattern) && pattern[p] == '*' {
				p++
			}
			break
		}
	}

	return p == len(pattern) && k == len(s)
}
