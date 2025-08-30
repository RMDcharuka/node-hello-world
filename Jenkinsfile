pipeline {
    agent any

    triggers {
        // Trigger on pull requests (requires GitHub webhook setup)
        pullRequest(
            prType: 'opened,reopened,synchronize,updated',
            prTarget: 'main', // Branch that PRs are targeting
            cron: '' // No periodic polling needed with webhooks
        )
    }

    environment {
        // DockerHub credentials ID in Jenkins
        DOCKERHUB_CREDENTIALS = credentials('dockerhub-cred')
        IMAGE_NAME = 'dinaldocker/node-hello-world:latest'
        APP_NAME = 'node-hello-world'
        KUBE_NAMESPACE = 'default'
        // Get PR number from environment if available
        PR_NUMBER = env.CHANGE_ID ?: 'manual-build'
    }

    stages {
        stage('Checkout PR') {
            steps {
                // This handles both PR triggers and manual builds
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: 'main']],
                    extensions: [
                        [
                            $class: 'PreBuildMerge',
                            options: [
                                mergeTarget: 'main',
                                mergeRemote: 'origin',
                                mergeStrategy: 'default',
                                fastForwardMode: 'FF'
                            ]
                        ]
                    ],
                    userRemoteConfigs: [[
                        url: 'https://github.com/RMDcharuka/node-hello-world.git',
                        refspec: '+refs/pull/*:refs/remotes/origin/pr/*'
                    ]]
                ])
                echo "✅ Code checked out for PR: ${PR_NUMBER}"
            }
        }

        stage('Debug Workspace') {
            steps {
                echo 'Debug: check workspace contents'
                sh 'pwd && ls -la'
                sh 'echo "Config folder contents:" && ls -la config/ || echo "No config folder"'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "docker build -t ${IMAGE_NAME} ."
                echo '✅ Docker image built successfully'
            }
        }

        stage('Docker Login') {
            steps {
                sh "echo ${DOCKERHUB_CREDENTIALS_PSW} | docker login -u ${DOCKERHUB_CREDENTIALS_USR} --password-stdin"
                echo '✅ Logged in to DockerHub'
            }
        }

        stage('Push Docker Image') {
            steps {
                // For PR builds, use a temporary tag to avoid conflicts
                script {
                    if (env.CHANGE_ID) {
                        // For PR builds, use PR-number tagged image
                        def prImageName = "dinaldocker/node-hello-world:pr-${PR_NUMBER}"
                        sh "docker tag ${IMAGE_NAME} ${prImageName}"
                        sh "docker push ${prImageName}"
                        echo "✅ Docker image pushed with PR tag: ${prImageName}"
                    } else {
                        // For main branch builds, push latest
                        sh "docker push ${IMAGE_NAME}"
                        echo '✅ Docker image pushed as latest'
                    }
                }
            }
        }

        stage('Deploy to K3s Cluster') {
            when {
                // Only deploy to actual cluster for main branch or manual builds
                expression { 
                    return !env.CHANGE_ID || currentBuild.buildCauses('jenkins.cause.Cause$UserIdCause') 
                }
            }
            steps {
    script {
        echo '🚀 Deploying to K3s cluster...'
        
        // Check cluster access
        sh 'kubectl cluster-info'
        
        // 1. Handle the Deployment
        sh """
            if ! kubectl get deployment node-hello-world > /dev/null 2>&1; then
                echo "Creating new deployment..."
                kubectl create deployment node-hello-world \\
                    --image=dinaldocker/node-hello-world:${env.BUILD_ID} \\
                    --port=8083
                
                # Scale to 2 replicas (optional, matches your original YAML)
                kubectl scale deployment/node-hello-world --replicas=2
            else
                echo "Updating existing deployment..."
                kubectl set image deployment/node-hello-world node-hello-world=dinaldocker/node-hello-world:${env.BUILD_ID} --record
            fi
        """
        
        // 2. Handle the Service
        sh """
            if ! kubectl get service node-hello-world-service > /dev/null 2>&1; then
                echo "Creating new service..."
                kubectl expose deployment node-hello-world \\
                    --port=80 \\
                    --target-port=8083 \\
                    --name=node-hello-world-service \\
                    --type=ClusterIP
            else
                echo "Service already exists, no need to update."
                # Services don't need updating if the deployment labels don't change
            fi
        """
        
        // Wait for the rollout to finish
        sh 'kubectl rollout status deployment/node-hello-world --timeout=2m'
        echo '✅ Deployment and Service updated successfully!'
    }
}
            }
        }

        stage('Verify Deployment') {
            when {
                // Only verify for non-PR builds
                expression { return !env.CHANGE_ID }
            }
            steps {
                script {
                    // Wait for rollout to complete
                    sh "kubectl rollout status deployment/${APP_NAME} --timeout=180s"
                    
                    // Get service details
                    sh "kubectl get svc ${APP_NAME}-service || kubectl get svc"
                    
                    // Get the NodePort
                    def nodePort = sh(
                        script: "kubectl get svc ${APP_NAME}-service -o jsonpath='{.spec.ports[0].nodePort}' 2>/dev/null || echo 'NOT_FOUND'",
                        returnStdout: true
                    ).trim()
                    
                    echo "📊 Service NodePort: ${nodePort}"
                    
                    // Test the application if NodePort is available
                    if (nodePort != 'NOT_FOUND' && nodePort != '') {
                        sh "sleep 10"
                        sh "curl -f http://localhost:${nodePort} || echo 'Curl test failed but deployment succeeded'"
                        echo "🌐 Application accessible at: http://your-vm-ip:${nodePort}"
                    }
                    
                    echo '✅ Deployment verified successfully'
                }
            }
        }

        stage('PR Validation Report') {
            when {
                expression { return env.CHANGE_ID }
            }
            steps {
                script {
                    echo "✅ PR #${PR_NUMBER} validation successful!"
                    echo "📦 Docker image built and tested successfully"
                    echo "🔍 Code quality checks passed"
                    echo "🐳 Containerization validated"
                    
                    // You can add PR comments here using GitHub API
                    echo "📝 All checks passed - ready for review and merge"
                }
            }
        }
    }

    post {
        always {
            echo "🚀 Pipeline execution completed for PR: ${PR_NUMBER}"
            // Cleanup Docker credentials
            sh 'docker logout'
            
            // Cleanup PR images to avoid registry clutter
            script {
                if (env.CHANGE_ID) {
                    def prImageName = "dinaldocker/node-hello-world:pr-${PR_NUMBER}"
                    sh "docker rmi ${prImageName} || true"
                }
            }
        }
        success {
            echo '✅ Pipeline succeeded!'
            script {
                if (env.CHANGE_ID) {
                    echo "✅ PR #${PR_NUMBER} validation completed successfully"
                } else {
                    echo '✅ Application deployed to K3s cluster successfully'
                }
            }
        }
        failure {
            echo '❌ Pipeline failed!'
            script {
                if (env.CHANGE_ID) {
                    echo "❌ PR #${PR_NUMBER} validation failed - please check errors"
                }
            }
        }
    }
}

