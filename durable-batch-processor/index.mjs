import {
  DurableContext,
  withDurableExecution,
} from "@aws/durable-execution-sdk-js";

export const handler = withDurableExecution(
  async (event, context) => {
    const batchId = event.batchId || `batch-${Date.now()}`;
    const dataFiles = event.dataFiles || [];
    
    console.log(`Starting data processing workflow for batch: ${batchId}`);
    
    try {
      // Step 1: Validate input data
      const validationResult = await context.step(async (stepContext) => {
        stepContext.logger.info(`Validating data batch ${batchId}`);
        
        if (!dataFiles || dataFiles.length === 0) {
          throw new Error("Data batch must contain at least one file");
        }
        
        const validatedFiles = dataFiles.map((file) => ({
          fileName: file.fileName,
          size: file.size || 0,
          format: file.format || 'unknown',
          status: 'validated'
        }));
        
        return { 
          batchId, 
          status: "validated",
          fileCount: validatedFiles.length,
          totalSize: validatedFiles.reduce((sum, file) => sum + file.size, 0),
          files: validatedFiles
        };
      });
      
      console.log(`Data validation completed:`, validationResult);
      
      // Step 2: Process each file
      const processingResults = [];
      for (let i = 0; i < validationResult.files.length; i++) {
        const file = validationResult.files[i];
        
        const fileResult = await context.step(async (stepContext) => {
          stepContext.logger.info(`Processing file ${file.fileName} in batch ${batchId}`);
          
          // Simulate file processing
          const processingTime = Math.floor(Math.random() * 5000) + 1000; // 1-6 seconds
          
          return {
            fileName: file.fileName,
            status: 'processed',
            processingTime,
            recordsProcessed: Math.floor(Math.random() * 10000) + 1000,
            outputLocation: `s3://processed-data/${batchId}/${file.fileName}`,
            processedAt: new Date().toISOString()
          };
        });
        
        processingResults.push(fileResult);
        console.log(`File processing completed for ${file.fileName}:`, fileResult);
        
        // Wait 2 seconds between files to simulate realistic processing
        if (i < validationResult.files.length - 1) {
          await context.wait({ seconds: 2 });
        }
      }
      
      // Step 3: Generate summary report
      const summaryResult = await context.step(async (stepContext) => {
        stepContext.logger.info(`Generating summary report for batch ${batchId}`);
        
        const totalRecords = processingResults.reduce((sum, result) => 
          sum + result.recordsProcessed, 0);
        
        const totalProcessingTime = processingResults.reduce((sum, result) => 
          sum + result.processingTime, 0);
        
        return {
          batchId,
          status: 'summarized',
          totalFiles: processingResults.length,
          totalRecords,
          totalProcessingTime,
          averageProcessingTime: Math.round(totalProcessingTime / processingResults.length),
          reportLocation: `s3://reports/${batchId}/summary.json`,
          generatedAt: new Date().toISOString()
        };
      });
      
      console.log(`Summary report generated:`, summaryResult);
      
      // Step 4: Send notification
      const notificationResult = await context.step(async (stepContext) => {
        stepContext.logger.info(`Sending completion notification for batch ${batchId}`);
        
        return {
          batchId,
          status: 'notified',
          notificationType: 'email',
          recipients: ['data-team@company.com'],
          message: `Data processing completed for batch ${batchId}. Processed ${summaryResult.totalRecords} records from ${summaryResult.totalFiles} files.`,
          sentAt: new Date().toISOString()
        };
      });
      
      console.log(`Notification sent:`, notificationResult);
      
      // Return final result
      const finalResult = {
        batchId: batchId,
        status: "completed",
        completedAt: new Date().toISOString(),
        summary: {
          validation: validationResult,
          processing: processingResults,
          report: summaryResult,
          notification: notificationResult
        },
        metrics: {
          totalFiles: validationResult.fileCount,
          totalRecords: summaryResult.totalRecords,
          totalProcessingTime: summaryResult.totalProcessingTime,
          averageProcessingTime: summaryResult.averageProcessingTime
        }
      };
      
      console.log(`Data processing workflow completed successfully:`, finalResult);
      return finalResult;
      
    } catch (error) {
      console.error(`Error in data processing workflow:`, error);
      
      // Step: Handle error and cleanup if needed
      const errorResult = await context.step(async (stepContext) => {
        stepContext.logger.error(`Handling error for batch ${batchId}: ${error.message}`);
        
        return {
          batchId,
          status: "failed",
          error: error.message,
          failedAt: new Date().toISOString()
        };
      });
      
      throw new Error(`Data processing failed: ${error.message}`);
    }
  }
);
