package do

type SettingDO struct {
	Base
	Key string  `json:"key" gorm:"column:key;uniqueIndex;not null"`
	Val *string `json:"val,omitempty" gorm:"column:val"`
}

func (d *SettingDO) TableName() string {
	return "setting"
}
