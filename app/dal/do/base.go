package do

import (
	"crypto/rand"
	"time"

	"github.com/oklog/ulid/v2"
	"gorm.io/gorm"
)

type Base struct {
	Id        string         `json:"id" gorm:"column:id;primaryKey;size:26"`
	CreatedAt time.Time      `json:"createdAt" gorm:"column:created_at;"`
	UpdatedAt time.Time      `json:"updatedAt" gorm:"column:updated_at;"`
	DeletedAt gorm.DeletedAt `json:"deletedAt" gorm:"column:deleted_at;index"`
}

func (m *Base) BeforeCreate(tx *gorm.DB) (err error) {
	if m.Id == "" {
		m.Id = GenUlid()
	}
	return
}

func GenUlid() string {
	t := time.Now().UTC()
	entropy := ulid.Monotonic(rand.Reader, 0)
	id, err := ulid.New(ulid.Timestamp(t), entropy)
	if err != nil {
		panic(err)
	}
	return id.String()
}
