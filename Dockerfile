FROM neo4j:latest
ENV DEBIAN_FRONTEND noninteractive
RUN apt-get update
RUN apt-get -y install python3 python3-pip
WORKDIR /app
COPY . .
RUN pip3 install --upgrade pip
RUN pip3 install -r app/requirements.txt
VOLUME ["/app/data"]
EXPOSE 5000 7474 7687
CMD ["./entrypoint.sh"]