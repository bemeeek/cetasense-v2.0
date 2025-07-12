#!/bin/bash
# Monitoring script untuk scaled architecture

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== CetaSense Scaled Architecture Monitor ===${NC}"

# Function untuk test health endpoints
test_health() {
    echo -e "\n${YELLOW}Testing Health Endpoints:${NC}"
    
    echo -n "Load Balancer: "
    if curl -s http://localhost/health > /dev/null; then
        echo -e "${GREEN}✓ OK${NC}"
    else
        echo -e "${RED}✗ FAIL${NC}"
    fi
    
    echo -n "Go Gateway Cluster: "
    if curl -s http://localhost/api/health > /dev/null; then
        echo -e "${GREEN}✓ OK${NC}"
    else
        echo -e "${RED}✗ FAIL${NC}"
    fi
    
    echo -n "Python API Cluster: "
    if curl -s http://localhost/localize/health > /dev/null; then
        echo -e "${GREEN}✓ OK${NC}"
    else
        echo -e "${RED}✗ FAIL${NC}"
    fi
    
    echo -n "Frontend: "
    if curl -s http://localhost/ > /dev/null; then
        echo -e "${GREEN}✓ OK${NC}"
    else
        echo -e "${RED}✗ FAIL${NC}"
    fi
}

# Function untuk check container status
check_containers() {
    echo -e "\n${YELLOW}Container Status:${NC}"
    docker-compose ps --format "table {{.Name}}\t{{.State}}\t{{.Status}}"
}

# Function untuk test load balancing
test_load_balancing() {
    echo -e "\n${YELLOW}Testing Load Balancing Distribution:${NC}"

    for i in {1..10}; do
        # dapatkan header X-Upstream-Addr
        upstream=$(curl -s -D - http://localhost/api/health -o /dev/null \
                    | grep -Fi X-Upstream-Addr \
                    | awk '{print $2}' | tr -d $'\r')
        echo "Request $i → Upstream: ${upstream:-unknown}"
        sleep 0.5
    done
    
    echo -e "\n${BLUE}Go Gateway Cluster (10 requests):${NC}"
    for i in {1..10}; do
        response=$(curl -s -H "Accept: application/json" http://localhost/api/health 2>/dev/null)
        if [ $? -eq 0 ]; then
            instance=$(echo $response | jq -r '.instance // "unknown"' 2>/dev/null || echo "unknown")
            echo "Request $i → Instance: $instance"
        else
            echo "Request $i → ERROR"
        fi
        sleep 0.5
    done
    
    echo -e "\n${BLUE}Python API Cluster (10 requests):${NC}"
    for i in {1..10}; do
        response=$(curl -s -H "Accept: application/json" http://localhost/localize/health 2>/dev/null)
        if [ $? -eq 0 ]; then
            instance=$(echo $response | jq -r '.instance // "unknown"' 2>/dev/null || echo "unknown")
            echo "Request $i → Instance: $instance"
        else
            echo "Request $i → ERROR"
        fi
        sleep 0.5
    done
}

# Function untuk monitor resource usage
monitor_resources() {
    echo -e "\n${YELLOW}Resource Usage:${NC}"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | head -15
}

# Function untuk check nginx status
nginx_status() {
    echo -e "\n${YELLOW}Nginx Load Balancer Status:${NC}"
    curl -s http://localhost/nginx_status 2>/dev/null || echo "Nginx status not available"
}

# Function untuk scaling summary
scaling_summary() {
    echo -e "\n${YELLOW}Scaling Summary:${NC}"
    
    # Count running instances
    go_instances=$(docker ps --filter "name=go_gateway" --format "{{.Names}}" | wc -l)
    py_instances=$(docker ps --filter "name=py_api" --format "{{.Names}}" | wc -l)
    celery_instances=$(docker ps --filter "name=celery_worker" --format "{{.Names}}" | wc -l)
    rabbit_instances=$(docker ps --filter "name=rabbit_consumer" --format "{{.Names}}" | wc -l)
    
    echo "Go Gateway instances: $go_instances"
    echo "Python API instances: $py_instances"
    echo "Celery Worker instances: $celery_instances"
    echo "RabbitMQ Consumer instances: $rabbit_instances"
    echo "Total backend instances: $((go_instances + py_instances + celery_instances + rabbit_instances))"
}

# Main menu
case "$1" in
    "health")
        test_health
        ;;
    "containers")
        check_containers
        ;;
    "loadbalance")
        test_load_balancing
        ;;
    "resources")
        monitor_resources
        ;;
    "nginx")
        nginx_status
        ;;
    "summary")
        scaling_summary
        ;;
    "all")
        test_health
        check_containers
        scaling_summary
        test_load_balancing
        ;;
    *)
        echo "Usage: $0 {health|containers|loadbalance|resources|nginx|summary|all}"
        echo
        echo "Commands:"
        echo "  health      - Test health endpoints"
        echo "  containers  - Check container status"
        echo "  loadbalance - Test load balancing distribution"
        echo "  resources   - Monitor resource usage"
        echo "  nginx       - Show nginx status"
        echo "  summary     - Show scaling summary"
        echo "  all         - Run all checks"
        exit 1
        ;;
esac