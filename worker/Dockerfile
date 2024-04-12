FROM node:20-alpine

COPY ./worker /worker
COPY .env /worker/.
WORKDIR /worker
RUN npm i
CMD npm run start
