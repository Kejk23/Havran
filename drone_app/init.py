import redis

if _name_ == '_main_':
    conn = redis.Redis(host='redismod', port='6379')

    model_file = open('models/model.pb', 'rb')
    model = model_file.read()
    model_file.close()
    gear_functions_file = open('gearconsumer.py', 'rb')
    gear_functions = gear_functions_file.read()
    gear_functions_file.close()    
    requirements_file = open('requirements.txt', 'rb')
    requirements = requirements_file.read().splitlines(True)
    requirements_file.close()
    
    # Loads the AI model to redis
    result = conn.execute_command('AI.MODELSET', 'customvisionmodel', 'TF', 'CPU', 'INPUTS', 'image_tensor', 'OUTPUTS', 'detected_boxes','detected_scores','detected_classes','BLOB', model)
    print(result)
    
    # Loads the Gear to register with the inspectiondata stream
    result = conn.execute_command('RG.PYEXECUTE', gear_functions, 'REQUIREMENTS', *requirements)
    print(result)
