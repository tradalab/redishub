package do

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Base struct {
	Id        uuid.UUID      `json:"id" gorm:"column:id;primaryKey;size:36"`
	CreatedAt time.Time      `json:"createdAt" gorm:"column:created_at;"`
	UpdatedAt time.Time      `json:"updatedAt" gorm:"column:updated_at;"`
	DeletedAt gorm.DeletedAt `json:"deletedAt" gorm:"column:deleted_at;index"`
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
