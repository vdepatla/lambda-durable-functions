// Simplified approval workflow that demonstrates the durable function pattern
// This version works without the AWS Durable Execution preview feature
export const handler = async (event, context) => {
  const requestId = event.requestId || `REQ-${Date.now()}`;
  
  console.log(`Starting approval workflow for request ${requestId}`);
  
  try {
    // Simulate the durable function workflow steps
    const workflow = {
      requestId: requestId,
      startTime: new Date().toISOString(),
      steps: []
    };
    
    // Step 1: Validate request
    console.log(`Step 1: Validating request ${requestId}`);
    
    if (!event.requester) {
      throw new Error("Request must include requester information");
    }
    
    if (!event.description) {
      throw new Error("Request must include a description");
    }
    
    const amount = event.amount || 0;
    let approverLevel = 'manager';
    let timeoutHours = 24;
    
    if (amount > 10000) {
      approverLevel = 'director';
      timeoutHours = 48;
    } else if (amount > 50000) {
      approverLevel = 'executive';
      timeoutHours = 72;
    }
    
    const validationResult = {
      requestId,
      status: "validated",
      requester: event.requester,
      description: event.description,
      amount,
      approverLevel,
      timeoutHours,
      validatedAt: new Date().toISOString()
    };
    
    workflow.steps.push({
      step: 1,
      name: "validation",
      result: validationResult,
      completedAt: new Date().toISOString()
    });
    
    console.log(`Request validation completed:`, validationResult);
    
    // Step 2: Submit for approval
    console.log(`Step 2: Submitting request ${requestId} for ${approverLevel} approval`);
    
    const approvalId = `appr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const submittedTo = `${approverLevel}@example.com`;
    
    const submissionResult = {
      requestId,
      status: "submitted_for_approval",
      approvalId,
      submittedTo,
      submittedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + timeoutHours * 60 * 60 * 1000).toISOString()
    };
    
    workflow.steps.push({
      step: 2,
      name: "submission",
      result: submissionResult,
      completedAt: new Date().toISOString()
    });
    
    console.log(`Request submitted for approval:`, submissionResult);
    
    // Step 3: Send notification to approver
    console.log(`Step 3: Sending approval notification for request ${requestId}`);
    
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const notificationResult = {
      requestId,
      status: "notification_sent",
      notificationId,
      sentTo: submittedTo,
      sentAt: new Date().toISOString()
    };
    
    workflow.steps.push({
      step: 3,
      name: "notification",
      result: notificationResult,
      completedAt: new Date().toISOString()
    });
    
    console.log(`Approval notification sent:`, notificationResult);
    
    // Step 4: Simulate approval decision (in real durable function, this would be a wait operation)
    console.log(`Step 4: Simulating approval decision for request ${requestId}`);
    
    const waitTimeMinutes = event.simulateApprovalTime || 2; // Default to 2 minutes for demo
    const approved = amount <= 100000; // Auto-approve requests under $100k for demo
    
    const approvalResult = {
      requestId,
      status: approved ? "approved" : "denied",
      approvedBy: approved ? submittedTo : null,
      reason: approved ? "Request meets approval criteria" : "Amount exceeds approval limit",
      approvedAt: new Date().toISOString(),
      simulatedWaitTime: `${waitTimeMinutes} minutes`
    };
    
    workflow.steps.push({
      step: 4,
      name: "approval_decision",
      result: approvalResult,
      completedAt: new Date().toISOString()
    });
    
    console.log(`Approval decision completed:`, approvalResult);
    
    // Step 5: Process result and send final notification
    let finalResult;
    
    if (approved) {
      console.log(`Step 5: Processing approved request ${requestId}`);
      
      finalResult = {
        requestId,
        status: "completed_successfully",
        processedAt: new Date().toISOString(),
        finalAmount: amount,
        approvedBy: submittedTo
      };
      
      workflow.steps.push({
        step: 5,
        name: "processing",
        result: finalResult,
        completedAt: new Date().toISOString()
      });
    } else {
      console.log(`Step 5: Handling denied request ${requestId}`);
      
      finalResult = {
        requestId,
        status: "completed_denied",
        deniedAt: new Date().toISOString(),
        reason: approvalResult.reason
      };
      
      workflow.steps.push({
        step: 5,
        name: "denial_processing",
        result: finalResult,
        completedAt: new Date().toISOString()
      });
    }
    
    console.log(`Request processing completed:`, finalResult);
    
    // Return comprehensive workflow result
    const result = {
      workflowId: requestId,
      status: "workflow_completed",
      completedAt: new Date().toISOString(),
      duration: `${Date.now() - new Date(workflow.startTime).getTime()}ms`,
      summary: {
        approved: approved,
        amount: amount,
        approverLevel: approverLevel,
        finalStatus: finalResult.status
      },
      workflow: workflow,
      note: "This is a simplified demonstration of the durable function pattern. In a real durable function, the wait operations would pause and resume execution, maintaining state across multiple invocations."
    };
    
    console.log(`Approval workflow completed successfully:`, result);
    return result;
    
  } catch (error) {
    console.error(`Error in approval workflow:`, error);
    
    return {
      workflowId: requestId,
      status: "workflow_failed",
      error: error.message,
      failedAt: new Date().toISOString(),
      note: "Workflow failed during execution. In a real durable function, this would trigger rollback and cleanup procedures."
    };
  }
};
