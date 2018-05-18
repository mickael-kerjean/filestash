#!/bin/bash
set -e
TERMUX_PATH=/data/data/com.termux/files
cd $TERMUX_PATH/usr/share

echo "======================="
echo "Nuage for Termux     =="
echo "======================="


echo "> Install system dependencies"
apt install -y nodejs git g++ make


echo "> Install Nuage"
if [ ! -d "nuage" ]; then
    git clone https://github.com/mickael-kerjean/nuage
    cd nuage
else
    cd nuage
    git reset --hard
    git pull origin master
fi


echo "> Configure Nuage for termux"
# get rid of nodegit until it's working (https://github.com/nodegit/nodegit/issues/1494)
cp .assets/scripts/git.js server/model/backend/git.js
sed -i '/nodegit/d' package.json
node .assets/scripts/configure_without_git.js
# setup node gyp for android build (node-sass compilation)
npm install node-gyp
node node_modules/node-gyp/bin/node-gyp.js configure > /dev/null 2>&1 || true # generate the "~/.node-gyp"
find ~/.node-gyp -name 'common.gypi' -exec sed -i "s/\-fPIE.*/\-fPIC' ],/g" {} \;


echo "> Installation"
npm install
npm run build
cat >> $TERMUX_PATH/usr/bin/nuage <<EOF
#!/bin/bash
node $TERMUX_PATH/usr/share/nuage/server/index.js &
EOF
chmod +x $TERMUX_PATH/usr/bin/nuage


echo "> Post install "
rm -rf ~/.node-gyp


echo "============================"
echo "COMPLETED"