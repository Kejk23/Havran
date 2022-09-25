export const averageFieldData = (data: any = []) => {
  const processData = data.reduce((acc = [], row: any) => {
    for (let key in row) {
      if (row[key] && !isNaN(row[key])) {
        if (!acc[key]) {
          acc[key] = 0;
        }
        acc[key] += parseFloat(row[key]);
      } else {
        if(row[key]) {
          acc[key] = row[key] 
        }
      }
    }
    return acc
  }, [])
  const len = data.length
  for (let key in processData) {
    if (processData[key] && !isNaN(processData[key])) {
      processData[key] = (processData[key] / len).toFixed(2);
    }
  }
  return processData
}