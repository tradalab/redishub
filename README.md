# RedisHub

## Ubuntu 20 env

- golang: 
    - sudo add-apt-repository ppa:longsleep/golang-backports
    - sudo apt update
    - sudo apt install golang-go -y

- nodejs: 
    - curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    - sudo apt install -y nodejs
- pnpm:
    - sudo corepack enable
- webview: 
    - sudo apt install -y libgtk-3-dev libwebkit2gtk-4.0-dev build-essential pkg-config
- fpm
    - sudo apt install ruby ruby-dev
    - sudo gem install --no-document fpm
