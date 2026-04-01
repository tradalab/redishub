package do

import (
	"net"
	"strconv"
)

type ConnectionDO struct {
	Base
	Mode             string   `json:"mode" gorm:"column:mode;default:'standalone';"`
	Name             string   `json:"name" gorm:"column:name;"`
	Network          string   `json:"network" gorm:"column:network;default:'tcp';"`
	Host             string   `json:"host" gorm:"column:host;"`
	Port             int      `json:"port" gorm:"column:port;"`
	Addrs            string   `json:"addrs" gorm:"column:addrs;"`
	SentinelMaster   string   `json:"sentinel_master" gorm:"column:sentinel_master;"`
	SentinelUsername string   `json:"sentinel_username" gorm:"column:sentinel_username;"`
	SentinelPassword string   `json:"sentinel_password" gorm:"column:sentinel_password;"`
	Sock             string   `json:"sock" gorm:"column:sock;"`
	Username         string   `json:"username" gorm:"column:username;"`
	Password         string   `json:"password" gorm:"column:password;"`
	AddrMapping      string   `json:"addr_mapping" gorm:"column:addr_mapping;"`
	LastDb           int      `json:"last_db" gorm:"column:last_db;default:0;"`
	ExecTimeout      int64    `json:"exec_timeout" gorm:"column:exec_timeout;default:60;"`
	DialTimeout      int64    `json:"dial_timeout" gorm:"column:dial_timeout;default:60;"`
	KeySize          int64    `json:"key_size" gorm:"column:key_size;default:10000;"`
	GroupId          *string  `json:"group_id" gorm:"column:group_id;size:36;"`
	Group            *GroupDO `json:"group,omitempty" gorm:"foreignKey:GroupId;references:Id"`
	SshEnable        bool     `json:"ssh_enable" gorm:"column:ssh_enable;default:0;"`
	SshId            *string  `json:"ssh_id" gorm:"column:ssh_id;size:36;"`
	Ssh              *SshDO   `json:"ssh,omitempty" gorm:"foreignKey:SshId;references:Id"`
	ProxyEnable      bool     `json:"proxy_enable" gorm:"column:proxy_enable;default:0;"`
	ProxyId          *string  `json:"proxy_id" gorm:"column:proxy_id;size:36;"`
	Proxy            *ProxyDO `json:"proxy,omitempty" gorm:"foreignKey:ProxyId;references:Id"`
	TlsEnable        bool     `json:"tls_enable" gorm:"column:tls_enable;default:0;"`
	TlsId            *string  `json:"tls_id" gorm:"column:tls_id;size:36;"`
	Tls              *TlsDO   `json:"tls,omitempty" gorm:"foreignKey:TlsId;references:Id"`
}

func (d *ConnectionDO) TableName() string {
	return "connection"
}

func (d *ConnectionDO) Addr() string {
	if (d.Mode == "sentinel" || d.Mode == "cluster") && d.Addrs != "" {
		return d.Addrs
	}
	return net.JoinHostPort(d.Host, strconv.Itoa(d.Port))
}
