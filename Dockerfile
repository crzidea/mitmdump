FROM node:slim

COPY package.json package-lock.json /application
WORKDIR /application
RUN npm install --production && npm cache clean --force

COPY . /application

CMD npm start
