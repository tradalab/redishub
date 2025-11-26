package client

import (
	"context"
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"github.com/tradalab/rdms/app/svc"
)

type GeneralLogicArgs struct {
	DatabaseId    string `json:"database_id" validate:"required"`
	DatabaseIndex int    `json:"database_index" validate:""`
}

type GeneralLogicResult struct {
	Info      interface{} `json:"info"`
	TotalDb   int         `json:"total_db"`
	Databases []DBInfo    `json:"databases"`
}

type DBInfo struct {
	Index   int    `json:"index"`
	Name    string `json:"name"`
	Keys    int    `json:"keys"`
	Expires int    `json:"expires"`
	AvgTTL  int64  `json:"avg_ttl"`
}

type ClientGeneralLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewClientGeneralLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ClientGeneralLogic {
	return &ClientGeneralLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *ClientGeneralLogic) ClientGeneralLogic(params GeneralLogicArgs) (interface{}, error) {
	cli, err := l.svcCtx.Cli.Get(params.DatabaseId, params.DatabaseIndex)
	if err != nil {
		return nil, err
	}

	info, err := cli.Rdb.Info(l.ctx).Result()
	if err != nil {
		return nil, err
	}

	config, err := cli.Rdb.ConfigGet(l.ctx, "databases").Result()
	if err != nil {
		return nil, err
	}

	totalDb, err := strconv.Atoi(config["databases"])
	if err != nil {
		return nil, err
	}

	// get db info
	dbMap := map[string]DBInfo{}
	lines := strings.Split(info, "\n")
	// regex: db0:keys=682,expires=149,avg_ttl=552837311
	r := regexp.MustCompile(`^(db\d+):keys=(\d+),expires=(\d+),avg_ttl=(\d+)`)
	for _, line := range lines {
		line = strings.TrimSpace(line)
		match := r.FindStringSubmatch(line)
		if len(match) == 5 {
			keys, _ := strconv.Atoi(match[2])
			expires, _ := strconv.Atoi(match[3])
			avgTTL, _ := strconv.ParseInt(match[4], 10, 64)
			dbMap[match[1]] = DBInfo{
				Name:    match[1],
				Keys:    keys,
				Expires: expires,
				AvgTTL:  avgTTL,
			}
		}
	}

	dbs := make([]DBInfo, 0, totalDb)
	for i := 0; i < totalDb; i++ {
		dbName := fmt.Sprintf("db%d", i)

		if val, ok := dbMap[dbName]; ok {
			val.Index = i
			dbs = append(dbs, val)
		} else {
			dbs = append(dbs, DBInfo{
				Index:   i,
				Name:    dbName,
				Keys:    0,
				Expires: 0,
				AvgTTL:  0,
			})
		}
	}

	return GeneralLogicResult{
		Info:      info,
		TotalDb:   totalDb,
		Databases: dbs,
	}, nil
}
