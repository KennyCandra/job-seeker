import { failedQueue } from "app/src/queue/failedQueue";


await failedQueue.add("data" , {
    type: "handleFailedQueue",
    prevAts: "ashby",
    companySlug: "amplemarket" 
})


process.exit()