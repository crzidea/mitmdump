FROM node:slim

COPY . /application
WORKDIR /application
RUN npm install --production && npm cache clean --force

CMD npm start
