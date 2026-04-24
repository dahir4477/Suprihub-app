FROM postgres:16-alpine

ENV POSTGRES_USER=root
ENV POSTGRES_PASSWORD=passWrd
ENV POSTGRES_DB=dispatchdb

COPY init.sql /docker-entrypoint-initdb.d/init.sql

EXPOSE 5432
