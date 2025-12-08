import {
  withDurableExecution,
} from "@aws/durable-execution-sdk-js";

export const handler = withDurableExecution(
  async (event, context) => {
    const requestId = event.requestId || `req-${Date.now()}`;
    const requestType = event.requestType || 'general';
    
    console.log(`Starting approval workflow for request: ${requestId} (type: ${requestType})`);
    
    try {
      // Step 1: Validate request
      const validationResult = await context.step(async (stepContext) => {
        stepContext.logger.info(`Validating approval request ${requestId}`);
        
        // Validate required fields
        if (!event.requester) {
          throw new Error("Requester information is required");
        }
        
        if (!event.description) {
          throw new Error("Request description is required");
        }
        
        // Determine approval requirements based on request type and amount
        const amount = event.amount || 0;
        let approverLevel = 'manager';
        let timeoutHours = 24;
        
        if (amount > 10000) {
          approverLevel = 'director';
          timeoutHours = 48;
        } else if (amount > 50000) {
          approverLevel = 'vp';
          timeoutHours = 72;
        }
        
        return {
          requestId,
          status: "validated",
          requester: event.requester,
          description: event.description,
          amount,
          approverLevel,
          timeoutHours,
          validatedAt: new Date().toISOString()
        };
      });
      
      console.log(`Request validation completed:`, validationResult);
      
      // Step 2: Submit for approval
      const submissionResult = await context.step(async (stepContext) => {
        stepContext.logger.info(`Submitting request ${requestId} for ${validationResult.approverLevel} approval`);
        
        // Simulate approval submission
        const approvalId = `appr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const submittedTo = `${validationResult.approverLevel}@example.com`;
        
        return {
          requestId,
          status: "submitted_for_approval",
          approvalId,
          submittedTo,
          submittedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + validationResult.timeoutHours * 60 * 60 * 1000).toISOString()
        };
      });
      
      console.log(`Request submitted for approval:`, submissionResult);
      
      // Step 3: Send notification to approver
      const notificationResult = await context.step(async (stepContext) => {
        stepContext.logger.info(`Sending approval notification for request ${requestId}`);
        
        const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        return {
          requestId,
          status: "notification_sent",
          notificationId,
          sentTo: submissionResult.submittedTo,
          sentAt: new Date().toISOString()
        };
      });
      
      console.log(`Approval notification sent:`, notificationResult);
      
      // Wait for approval (simulate human intervention time)
      const waitTimeMinutes = event.simulateApprovalTime || 2; // Default to 2 minutes for demo
      console.log(`Waiting ${waitTimeMinutes} minutes for human approval of request ${requestId}`);
      await context.wait({ minutes: waitTimeMinutes });
      console.log(`Approval wait period completed for request ${requestId}`);
      
      // Step 4: Check approval status (simulate approval decision)
      const approvalCheckResult = await context.step(async (stepContext) => {
        stepContext.logger.info(`Checking approval status for request ${requestId}`);
        
        // Simulate approval decision (90% approval rate)
        const isApproved = Math.random() > 0.1;
        const approvedBy = isApproved ? submissionResult.submittedTo : null;
        const decision = isApproved ? 'approved' : 'rejected';
        const comments = isApproved 
          ? 'Request approved after review'
          : 'Request rejected - requires additional documentation';
        
        return {
          requestId,
          status: `approval_${decision}`,
          decision,
          approvedBy,
          comments,
          decidedAt: new Date().toISOString()
        };
      });
      
      console.log(`Approval status checked:`, approvalCheckResult);
      
      // Step 5: Process based on approval decision
      if (approvalCheckResult.decision === 'approved') {
        // Step 5a: Execute approved request
        const executionResult = await context.step(async (stepContext) => {
          stepContext.logger.info(`Executing approved request ${requestId}`);
          
          // Simulate request execution
          const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Different execution logic based on request type
          let executionDetails = {};
          switch (validationResult.requestType || requestType) {
            case 'budget_increase':
              executionDetails = {
                budgetIncreased: true,
                newBudgetLimit: (event.currentBudget || 0) + validationResult.amount
              };
              break;
            case 'access_request':
              executionDetails = {
                accessGranted: true,
                grantedPermissions: event.requestedPermissions || ['read']
              };
              break;
            default:
              executionDetails = {
                actionTaken: 'general_approval_processed',
                details: validationResult.description
              };
          }
          
          return {
            requestId,
            status: "executed",
            executionId,
            ...executionDetails,
            executedAt: new Date().toISOString()
          };
        });
        
        console.log(`Request execution completed:`, executionResult);
        
        // Step 5b: Send approval confirmation
        const confirmationResult = await context.step(async (stepContext) => {
          stepContext.logger.info(`Sending approval confirmation for request ${requestId}`);
          
          const confirmationId = `conf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          return {
            requestId,
            status: "approval_confirmed",
            confirmationId,
            sentTo: validationResult.requester.email,
            sentAt: new Date().toISOString()
          };
        });
        
        console.log(`Approval confirmation sent:`, confirmationResult);
        
        // Return successful completion
        const finalResult = {
          requestId: requestId,
          status: "completed_approved",
          completedAt: new Date().toISOString(),
          workflowSteps: {
            validation: validationResult,
            submission: submissionResult,
            notification: notificationResult,
            approvalCheck: approvalCheckResult,
            execution: executionResult,
            confirmation: confirmationResult
          },
          summary: {
            decision: 'approved',
            approvedBy: approvalCheckResult.approvedBy,
            executionId: executionResult.executionId,
            completionTime: new Date().toISOString()
          }
        };
        
        console.log(`Approval workflow completed successfully (approved):`, finalResult);
        return finalResult;
        
      } else {
        // Step 5a: Handle rejection
        const rejectionResult = await context.step(async (stepContext) => {
          stepContext.logger.info(`Processing rejection for request ${requestId}`);
          
          const rejectionId = `rej_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          return {
            requestId,
            status: "rejection_processed",
            rejectionId,
            reason: approvalCheckResult.comments,
            processedAt: new Date().toISOString()
          };
        });
        
        console.log(`Rejection processed:`, rejectionResult);
        
        // Step 5b: Send rejection notification
        const rejectionNotificationResult = await context.step(async (stepContext) => {
          stepContext.logger.info(`Sending rejection notification for request ${requestId}`);
          
          const notificationId = `notif_rej_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          return {
            requestId,
            status: "rejection_notified",
            notificationId,
            sentTo: validationResult.requester.email,
            sentAt: new Date().toISOString()
          };
        });
        
        console.log(`Rejection notification sent:`, rejectionNotificationResult);
        
        // Return rejection completion
        const finalResult = {
          requestId: requestId,
          status: "completed_rejected",
          completedAt: new Date().toISOString(),
          workflowSteps: {
            validation: validationResult,
            submission: submissionResult,
            notification: notificationResult,
            approvalCheck: approvalCheckResult,
            rejectionProcessing: rejectionResult,
            rejectionNotification: rejectionNotificationResult
          },
          summary: {
            decision: 'rejected',
            rejectedBy: approvalCheckResult.approvedBy || 'system',
            reason: approvalCheckResult.comments,
            completionTime: new Date().toISOString()
          }
        };
        
        console.log(`Approval workflow completed (rejected):`, finalResult);
        return finalResult;
      }
      
    } catch (error) {
      console.error(`Error in approval workflow:`, error);
      
      // Step: Handle error and cleanup
      const errorResult = await context.step(async (stepContext) => {
        stepContext.logger.error(`Handling error for request ${requestId}: ${error.message}`);
        
        return {
          requestId,
          status: "failed",
          error: error.message,
          failedAt: new Date().toISOString()
        };
      });
      
      throw new Error(`Approval workflow failed: ${error.message}`);
    }
  }
);
