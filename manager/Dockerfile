FROM node:20-alpine

COPY ./manager /manager
COPY .env /manager/.
WORKDIR /manager
RUN npm i
CMD npm run start
