#!/bin/bash

# Configuration
COMPOSE_FILES=("-f" "docker-compose-standalone.yaml" "-f" "docker-compose-sentinel.yaml" "-f" "docker-compose-cluster.yaml")

function up() {
    echo "Starting all Redis components..."
    docker compose "${COMPOSE_FILES[@]}" up -d
}

function down() {
    echo "Stopping all Redis components..."
    docker compose "${COMPOSE_FILES[@]}" down
}

function status() {
    echo "Status of Redis components:"
    docker compose "${COMPOSE_FILES[@]}" ps
}

function logs() {
    echo "Logs for Redis components:"
    docker compose "${COMPOSE_FILES[@]}" logs -f
}

function init_cluster() {
    echo "Initializing Redis Cluster..."
    # Wait a bit for nodes to be ready
    sleep 5
    docker exec redis-node-1 redis-cli -a rdh_cluster_pwd --cluster create \
        $(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' redis-node-1):6379 \
        $(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' redis-node-2):6379 \
        $(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' redis-node-3):6379 \
        --cluster-replicas 0 --cluster-yes
}

case "$1" in
    up)
        up
        ;;
    down)
        down
        ;;
    status)
        status
        ;;
    logs)
        logs
        ;;
    init-cluster)
        init_cluster
        ;;
    *)
        echo "Usage: $0 {up|down|status|logs|init-cluster}"
        exit 1
        ;;
esac
