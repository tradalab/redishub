package netx

import (
	"io"
	"net"

	"golang.org/x/crypto/ssh"
)

func StartSSHTunnel(sshClient *ssh.Client, network string, remoteAddr string) (string, error) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return "", err
	}
	go func() {
		for {
			localConn, err := listener.Accept()
			if err != nil {
				return
			}
			go func() {
				remoteConn, err := sshClient.Dial(network, remoteAddr)
				if err != nil {
					_ = localConn.Close()
					return
				}
				go func() {
					_, _ = io.Copy(remoteConn, localConn)
					_ = remoteConn.Close()
				}()
				go func() {
					_, _ = io.Copy(localConn, remoteConn)
					_ = localConn.Close()
				}()
			}()
		}
	}()
	return listener.Addr().String(), nil
}
