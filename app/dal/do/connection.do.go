package do

import (
	"net"
	"strconv"
)

type ConnectionDO struct {
	Base
	Name      string   `json:"name" gorm:"column:name;"`
	Network   string   `json:"network" gorm:"column:network;default:'tcp';"`
	Host      string   `json:"host" gorm:"column:host;"`
	Port      int      `json:"port" gorm:"column:port;"`
	Sock      string   `json:"sock" gorm:"column:sock;"`
	Username  string   `json:"username" gorm:"column:username;"`
	Password  string   `json:"password" gorm:"column:password;"`
	LastDb    int      `json:"last_db" gorm:"column:last_db;default:0;"`
	GroupId   *string  `json:"group_id" gorm:"column:group_id;size:36;"`
	Group     *GroupDO `json:"group,omitempty" gorm:"-"`
	SshEnable bool     `json:"ssh_enable" gorm:"column:ssh_enable;"`
	SshId     *string  `json:"ssh_id" gorm:"column:ssh_id;size:36;"`
	SshDO     *SshDO   `json:"ssh,omitempty" gorm:"-"`
}

func (d *ConnectionDO) TableName() string {
	return "connection"
}

func (d *ConnectionDO) Addr() string {
	return net.JoinHostPort(d.Host, strconv.Itoa(d.Port))
}
