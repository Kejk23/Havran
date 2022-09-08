FROM redislabs/redismod
FROM redislabs/redisai:edge-cpu-bionic as redisai
FROM redislabs/redistimeseries:edge as redistimeseries
FROM redislabs/redisgears:1.2.5

WORKDIR /usr/src/app

ENV LD_LIBRARY_PATH /usr/lib/redis/modules
ENV REDISTIMESERIES_DEPS libssl-dev
ENV FontPath /data/fonts

COPY requirements.txt ./
RUN set -ex; \
    apt-get update; \
    apt-get install -y --no-install-recommends ${REDISGRAPH_DEPS}; \
    apt-get install ffmpeg libsm6 libxext6  -y; \
    apt-get install python3 -y; \
    pip install --no-cache-dir --upgrade pip

    
COPY . . 
COPY --from=redisai ${LD_LIBRARY_PATH}/redisai.so ${LD_LIBRARY_PATH}/
COPY --from=redisai ${LD_LIBRARY_PATH}/backends ${LD_LIBRARY_PATH}/backends
COPY --from=redistimeseries ${LD_LIBRARY_PATH}/*.so ${LD_LIBRARY_PATH}/

ENTRYPOINT ["redis-server"]

CMD ["--loadmodule", "/usr/lib/redis/modules/redisai.so", \
     "--loadmodule", "/usr/lib/redis/modules/redistimeseries.so", \
     "--loadmodule", "/var/opt/redislabs/lib/modules/redisgears.so", \
     "Plugin", "/var/opt/redislabs/modules/rg/plugin/gears_python.so",\
     "Plugin", "/var/opt/redislabs/modules/rg/plugin/gears_jvm.so", \
     "JvmOptions", "-Djava.class.path=/var/opt/redislabs/modules/rg/gear_runtime-jar-with-dependencies.jar", \
     "JvmPath", "/var/opt/redislabs/modules/rg/OpenJDK/jdk-11.0.9.1+1/"]