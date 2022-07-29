import os
import shutil
import subprocess

# Runs input string in terminal
def run(string): 
    subprocess.run(string.split())

# Searches for Unreal Directory in unusual locations
def find_unreal_4():
    for root in [x[0] for x in os.walk(r"/Users")]:
        if 'UE_4.27' in str(root):
            return(root)

# Installs AirSim
def installer():
    # Basic setup
    griffin_directory = os.getcwd()
    airsim_directory = griffin_directory + r"/AirSim"
    os.chdir(airsim_directory)
    run("./setup.sh")
    run('./build.sh')

    # Finds your Unreal directory
    unreal_directory = r"/Users/Shared/Epic Games/UE_4.27"
    if os.path.isdir(unreal_directory) == False:
        unreal_directory = find_unreal_4()

    # Fixes a bug in AirSim
    bug_path = unreal_directory + r"/Engine/Source/Programs/UnrealBuildTool/Platform/Mac/MacToolChain.cs"
    os.remove(bug_path)
    src_path = griffin_directory + r"/MacToolChain.cs"
    shutil.copy(src_path, bug_path)

    # Creates a Xcode workspace
    blocks_directory = airsim_directory + r"/Unreal/Environments/Blocks"
    os.chdir(blocks_directory)
    subprocess.run(['./GenerateProjectFiles.sh', str(unreal_directory)])

    # Runs and build the rest
    run("xed .")
    run("xcodebuild -workspace Blocks.xcworkspace -scheme UE4")
    run("xcodebuild -workspace Blocks.xcworkspace -scheme Blocks")
    run("open Blocks.uproject")

if __name__ == '__main__':
    installer()
