# Enterprise Integration Patterns with Serverless and CDK

Choosing our messaging technology

## Overview

If you are interested in [Event-Driven Architecture (EDA)](https://aws.amazon.com/event-driven-architecture/) then I would highly recommend you reading [Enterprise Integration Patterns: Designing, Building, and Deploying Messaging Solutions](https://www.amazon.co.uk/Enterprise-Integration-Patterns-Designing-Addison-Wesley/dp/0321200683). Although published first in 2003, this book contains a catalogue of sixty-five messaging patterns still relevant today. Maybe even more so, given the ease of building with such patterns today. It also explores in detail the advantages and limitations of asynchronous messaging architectures.

The book also includes some case studies and their implementation. However, this is where the age of the book shows, as this snippet from the Amazon brief indicates:

> The authors also include examples covering a variety of different integration technologies, such as __JMS, MSMQ, TIBCO ActiveEnterprise, Microsoft BizTalk, SOAP, and XSL__.

In this series of blog posts, I will look at one of the example case studies from the book and implement it using [AWS](TODO) serverless services and [CDK](https://aws.amazon.com/cdk/).

## The Loan Broker case study

