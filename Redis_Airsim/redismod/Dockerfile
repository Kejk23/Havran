FROM redislabs/redismod
FROM redislabs/redisai:edge-cpu-bionic as redisai
FROM redislabs/redistimeseries:edge as redistimeseries
FROM redislabs/redisgears:1.2.5

WORKDIR /data

ENV LD_LIBRARY_PATH /usr/lib/redis/modules
ENV REDISTIMESERIES_DEPS libssl-dev
ENV FontPath /data/fonts

RUN set -ex; \
    apt-get update; \
    apt-get install -y --no-install-recommends ${REDISGRAPH_DEPS}; \
    apt-get install ffmpeg libsm6 libxext6 python3-setuptools libglib2.0-0 libxrender1 libxext6 libgomp1 -y
    
COPY . . 
COPY --from=redisai ${LD_LIBRARY_PATH}/redisai.so ${LD_LIBRARY_PATH}/
COPY --from=redisai ${LD_LIBRARY_PATH}/backends ${LD_LIBRARY_PATH}/backends
COPY --from=redistimeseries ${LD_LIBRARY_PATH}/*.so ${LD_LIBRARY_PATH}/

ENTRYPOINT ["redis-server"]

ENV PYTHONPATH /var/opt/redislabs/modules/rg/python3_1.2.5

CMD ["--loadmodule", "/usr/lib/redis/modules/redisai.so", \
     "--loadmodule", "/usr/lib/redis/modules/redistimeseries.so", \
     "--loadmodule", "/var/opt/redislabs/lib/modules/redisgears.so", \
     "Plugin", "/var/opt/redislabs/modules/rg/plugin/gears_python.so",\
     "Plugin", "/var/opt/redislabs/modules/rg/plugin/gears_jvm.so", \
     "JvmOptions", "-Djava.class.path=/var/opt/redislabs/modules/rg/gear_runtime-jar-with-dependencies.jar", \
     "JvmPath", "/var/opt/redislabs/modules/rg/OpenJDK/jdk-11.0.9.1+1/"]