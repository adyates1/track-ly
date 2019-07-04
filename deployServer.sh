if ! [ $(id -u) = 0 ]; then
   echo "FATAL ERROR: THIS SCRIPT MUST BE RUN AS ROOT"
   exit 1
fi
echo "If not already, please run as ROOT"
echo "Killing existing Node process(es)"
pkill node
echo "Node Killed"
echo "Running app-local with extended memory"
node app.js --max-old-space-size=16000 >> logs.txt &