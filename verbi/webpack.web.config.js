/*
********************************************
 Copyright © 2021 Agora Lab, Inc., all rights reserved.
 AppBuilder and all associated components, source code, APIs, services, and documentation 
 (the “Materials”) are owned by Agora Lab, Inc. and its licensors. The Materials may not be 
 accessed, used, modified, or distributed for any purpose without a license from Agora Lab, Inc.  
 Use without a license or in violation of any license terms and conditions (including use for 
 any purpose competitive to Agora Lab, Inc.’s business) is strictly prohibited. For more 
 information visit https://appbuilder.agora.io. 
*********************************************
*/
const commons = require('./webpack.commons');
const {merge} = require('webpack-merge');
const path = require('path');

const isDevelopment = process.env.NODE_ENV === 'development';

module.exports = merge(commons, {
  // Enable optimizations in production
  mode: isDevelopment ? 'development' : 'production',
  // Main entry point for the web application
  entry: {
    main: './index.web.js',
  },
  output: {
    path: path.resolve(__dirname, `../Builds/web`),
  },
  // --- ALTERAÇÃO ADICIONADA AQUI ---
  // A seção 'resolve' ajuda o Webpack a encontrar os pacotes.
  resolve: {
    // 'alias' cria um atalho.
    alias: {
      // Diz ao Webpack para encontrar o 'agora-rn-uikit' diretamente na pasta node_modules.
      'agora-rn-uikit': path.resolve(__dirname, 'node_modules/agora-rn-uikit'),
    },
    // Se você já tiver uma propriedade 'extensions' aqui, mantenha-a.
    // Exemplo: extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },
  // --- FIM DA ALTERAÇÃO ---

  // Webpack dev server config
  devServer: {
    port: 9000,
    // https: true,
    historyApiFallback: true, // Support for react-router
    static: './', // same as contentBase from webpack v4 config
    client: {
      overlay: false,
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    },
  },
});