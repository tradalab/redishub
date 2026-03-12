package do

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Base struct {
	Id        uuid.UUID      `json:"id" gorm:"column:id;primaryKey;size:36"`
	CreatedAt time.Time      `json:"created_at" gorm:"column:created_at;"`
	UpdatedAt time.Time      `json:"updated_at" gorm:"column:updated_at;"`
	DeletedAt gorm.DeletedAt `json:"deleted_at" gorm:"column:deleted_at;index"`
}

func (m *Base) BeforeCreate(tx *gorm.DB) error {
	if m.Id == uuid.Nil {
		id, err := uuid.NewV7()
		if err != nil {
			return err
		}
		m.Id = id
	}
	return nil
}
