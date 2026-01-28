package do

type GroupDO struct {
	Base
	Name        string          `json:"name" gorm:"column:name;"`
	Connections []*ConnectionDO `json:"connections,omitempty" gorm:"foreignKey:GroupId;references:Id"`
}

func (d *GroupDO) TableName() string {
	return "group"
}
