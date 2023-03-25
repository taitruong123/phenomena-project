module.exports ={
  module: {
      rules: [
          {
              test:/\.js$/,
              exclude: /mode_modules/,
              loader: 'babel-loader',
              options: {
                  presets: ['@babel/preset-react']
              }
          }
      ]
  }
};