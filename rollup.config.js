// import babel from 'rollup-plugin-babel';
import buble from 'rollup-plugin-buble';
import alias from 'rollup-plugin-alias';
import async from 'rollup-plugin-async';

const path = require('path');

export default {
    entry: path.join(__dirname, 'example.js'),
    targets: [
        {dest: path.join(__dirname, 'example/streamedian.js'), format: 'es'}
    ],
    sourceMap: true,
    plugins: [
        async(),
        //buble({
            //exclude: 'node_modules/**'
        //}),
        alias({
            bp_logger: path.join(__dirname,'node_modules/bp_logger/logger.js'),
            bp_event: path.join(__dirname,'node_modules/bp_event/event.js'),
            bp_statemachine: path.join(__dirname,'node_modules/bp_statemachine/statemachine.js'),
            jsencrypt: path.join(__dirname,'node_modules/jsencrypt/src/jsencrypt.js'),
            rtsp: path.join(__dirname,'node_modules/html5_rtsp_player/src'),
            streamedian: path.join(__dirname,'src')
        })
    ]

}
