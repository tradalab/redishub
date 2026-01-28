package do

import (
	"net"
	"strconv"
)

type ConnectionDO struct {
	Base
	Name     string   `json:"name" gorm:"column:name;"`
	Network  string   `json:"network" gorm:"column:network;default:'tcp';"`
	Host     string   `json:"host" gorm:"column:host;"`
	Port     int      `json:"port" gorm:"column:port;"`
	Sock     string   `json:"sock" gorm:"column:sock;"`
	Username string   `json:"username" gorm:"column:username;"`
	Password string   `json:"password" gorm:"column:password;"`
	LastDb   int      `json:"last_db" gorm:"column:last_db;default:0;"`
	GroupId  *string  `json:"groupId" gorm:"column:group_id;"`
	Group    *GroupDO `json:"group,omitempty" gorm:"_"`
}

func (d *ConnectionDO) TableName() string {
	return "connection"
}

func (d *ConnectionDO) Addr() string {
	return net.JoinHostPort(d.Host, strconv.Itoa(d.Port))
}
