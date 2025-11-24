package do

type GroupDO struct {
	Base
	Name      string        `json:"name" gorm:"column:name;"`
	Databases []*DatabaseDO `json:"databases,omitempty" gorm:"foreignKey:GroupId;references:Id"`
}

func (d *GroupDO) TableName() string {
	return "group"
}
