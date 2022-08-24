import os
import platform
import subprocess
from stat import S_IWUSR, S_IREAD, S_IRGRP, S_IROTH

# Runs input string in terminal
def run(string): 
    subprocess.run(string.split())

# Useless for now, but will be needed later
def get_drives():
    import psutil
    result = []
    for disk in psutil.disk_partitions():
        result.append(disk[0])

# Searches for Unreal Directory
def find_unreal_4(directory):
    for root in [x[0] for x in os.walk(directory)]:
        if 'UE_4.27' in str(root):
            return(root)

# Installs AirSim
def installer():
    # Clones AirSim and cds into it
    griffin_directory = os.getcwd()
    run("git clone https://github.com/Microsoft/AirSim.git")
    airsim_directory = griffin_directory + r"/AirSim"
    os.chdir(airsim_directory)

    if platform.system() == "Darwin":
        # Build stufff
        run("./setup.sh")
        run('./build.sh')

        # Finds your Unreal directory
        unreal_directory = r"/Users/Shared/Epic Games/UE_4.27"
        if os.path.isdir(unreal_directory) == False:
            unreal_directory = find_unreal_4(r"/Users")

        # Fixes a bug in UE4
        bug_path = unreal_directory + r"/Engine/Source/Programs/UnrealBuildTool/Platform/Mac/MacToolChain.cs"
        os.chmod(bug_path, S_IWUSR|S_IREAD|S_IRGRP|S_IROTH)
        f = open(bug_path, "r", encoding="utf-8-sig")
        lines = f.read().splitlines(True)   
        lines.insert(191, '            Result += "-Wno-unused-but-set-variable"')
        f.close()
        f = open(bug_path, "w", encoding="utf-8-sig")
        f.writelines(lines)
        f.close()

        # Creates a Xcode workspace
        blocks_directory = airsim_directory + r"/Unreal/Environments/Blocks"
        os.chdir(blocks_directory)
        subprocess.run(['./GenerateProjectFiles.sh', str(unreal_directory)])

        # Runs and build the rest
        run("xed .")
        run("xcodebuild -workspace Blocks.xcworkspace -scheme UE4")
        run("xcodebuild -workspace Blocks.xcworkspace -scheme Blocks")
        run("open Blocks.uproject")

    if platform.system() == "Windows":
        # Builds stuff
        run("build.cmd")

        # Runs stuff
        blocks_directory = os.getcwd() + r"/Unreal/Environments/Blocks"
        os.chdir(blocks_directory)
        run("start Blocks.sln")

    if platform.system() == "Linux":
        # Builds stuff
        run("./setup.sh")
        run("./build.sh")

if __name__ == '__main__':
    installer()
