package pubsub

import (
	"context"
	"fmt"
	"strings"

	"github.com/tradalab/rdms/app/svc"
)

type SubscribeLogicArgs struct {
	ConnectionId  string   `json:"connection_id" validate:"required"`
	DatabaseIndex int      `json:"database_index"`
	Channels      []string `json:"channels" validate:"required"`
}

type PublishLogicArgs struct {
	ConnectionId  string `json:"connection_id" validate:"required"`
	DatabaseIndex int    `json:"database_index"`
	Channel       string `json:"channel" validate:"required"`
	Message       string `json:"message" validate:"required"`
}

type PubsubMessage struct {
	Channel string `json:"channel"`
	Message string `json:"message"`
	Pattern string `json:"pattern,omitempty"`
}

type PubsubLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewPubsubLogic(ctx context.Context, svcCtx *svc.ServiceContext) *PubsubLogic {
	return &PubsubLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *PubsubLogic) Subscribe(args SubscribeLogicArgs) (interface{}, error) {
	c, err := l.svcCtx.Cli.Get(args.ConnectionId, args.DatabaseIndex)
	if err != nil {
		return nil, err
	}

	c.PubSubMu.Lock()
	defer c.PubSubMu.Unlock()

	if c.PubSub == nil {
		c.PubSub = c.Rdb.Subscribe(context.Background())
	}

	var exact []string
	var pattern []string

	for _, ch := range args.Channels {
		if strings.ContainsAny(ch, "*?") {
			pattern = append(pattern, ch)
		} else {
			exact = append(exact, ch)
		}
	}

	if len(exact) > 0 {
		err = c.PubSub.Subscribe(context.Background(), exact...)
		if err != nil {
			return nil, err
		}
	}
	if len(pattern) > 0 {
		err = c.PubSub.PSubscribe(context.Background(), pattern...)
		if err != nil {
			return nil, err
		}
	}

	if !c.PubSubActive {
		c.PubSubActive = true
		eventOut := fmt.Sprintf("pubsub:message:%s", args.ConnectionId)
		
		go func() {
			defer func() {
				c.PubSubMu.Lock()
				c.PubSubActive = false
				c.PubSubMu.Unlock()
			}()
			
			// pubsub.Channel() automatically handles reconnects under the hood and returns a go-channel that streams messages
			ch := c.PubSub.Channel()
			for msg := range ch {
				l.svcCtx.App.Evt().Emit(context.Background(), "", eventOut, PubsubMessage{
					Channel: msg.Channel,
					Message: msg.Payload,
					Pattern: msg.Pattern,
				})
			}
		}()
	}

	return "subscribed", nil
}

func (l *PubsubLogic) Unsubscribe(args SubscribeLogicArgs) (interface{}, error) {
	c, err := l.svcCtx.Cli.Get(args.ConnectionId, args.DatabaseIndex)
	if err != nil {
		return nil, err
	}

	c.PubSubMu.Lock()
	defer c.PubSubMu.Unlock()

	if c.PubSub != nil {
		if len(args.Channels) == 0 {
			// Unsubscribe from all if no channels provided
			err = c.PubSub.Unsubscribe(context.Background())
			_ = c.PubSub.PUnsubscribe(context.Background())
		} else {
			var exact []string
			var pattern []string

			for _, ch := range args.Channels {
				if strings.ContainsAny(ch, "*?") {
					pattern = append(pattern, ch)
				} else {
					exact = append(exact, ch)
				}
			}

			if len(exact) > 0 {
				err = c.PubSub.Unsubscribe(context.Background(), exact...)
			}
			if len(pattern) > 0 {
				errPattern := c.PubSub.PUnsubscribe(context.Background(), pattern...)
				if err == nil {
					err = errPattern
				}
			}
		}
		
		if err != nil {
			return nil, err
		}
	}

	return "unsubscribed", nil
}

func (l *PubsubLogic) Publish(args PublishLogicArgs) (interface{}, error) {
	c, err := l.svcCtx.Cli.Get(args.ConnectionId, args.DatabaseIndex)
	if err != nil {
		return nil, err
	}

	// Use the main connection (not the PubSub dedicated connection) to publish
	res, err := c.Rdb.Publish(context.Background(), args.Channel, args.Message).Result()
	if err != nil {
		return nil, err
	}

	// Returns the number of clients that received the message
	return res, nil
}
