package do

type SshDO struct {
	Base
	Host           string          `json:"host" gorm:"column:host;"`
	Port           int             `json:"port" gorm:"column:port;"`
	Username       string          `json:"username" gorm:"column:username;"`
	Kind           string          `json:"kind" gorm:"column:kind;"`
	Password       string          `json:"password" gorm:"column:password;"`
	PrivateKeyFile string          `json:"private_key_file" gorm:"column:private_key_file;"`
	Passphrase     string          `json:"passphrase" gorm:"column:passphrase;"`
	Connections    []*ConnectionDO `json:"connections,omitempty" gorm:"foreignKey:SshId;references:Id"`
}

func (d *SshDO) TableName() string {
	return "ssh"
}
